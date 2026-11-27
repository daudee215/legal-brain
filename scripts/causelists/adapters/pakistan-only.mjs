/**
 * Official Lahore High Court cause lists use three public HTML forms. The data host returns
 * HTTP 403 for /robots.txt and serves the forms and their public results from Pakistan.
 */
import { log, looksLikeChallenge, pktToday, politeFetch, sleep, squashSpaces } from '../lib/common.mjs';

const base = 'https://data.lhc.gov.pk';
const seats = {
  ucrijaz: 'Lahore',
  bwpsaeed: 'Bahawalpur',
  Mulriaz: 'Multan',
  RWPAbid: 'Rawalpindi',
};
const feeds = [
  { result: 'cause_list_regular_result.php', params: (date) => ({ weekDay: date, color: 'All' }) },
  { result: 'cause_list_supply_result.php', params: (date) => ({ format1: '', issueDate: '', hearingDate: date, color: 'All' }) },
  { result: 'cause_list_urgent2_result.php', params: (date) => date === pktToday() ? {} : null },
];

function caseNumber(category, raw) {
  const simple = raw.match(/^(?:\d+\.)?(\d{1,6}(?:-[A-Z]{1,2})?)\s*[/-]\s*(\d{2}|\d{4})$/i);
  if (!simple) return raw;
  const [, number, year] = simple;
  const [group, subtype] = category.split(' - ');
  let type = subtype ?? group;
  if (group === 'Writ' && !/criminal original/i.test(type)) type = 'Writ Petition';
  if (/^First Appeal (?:Against|From) Order/i.test(type)) type = 'F.A.O.';
  if (/^Regular First Appeal/i.test(type)) type = 'Regular First Appeal';
  if (/^C\.M\./i.test(type)) type = 'C.M.';
  return `${type} ${number}/${year.length === 2 ? (Number(year) >= 47 ? '19' : '20') + year : year}`.trim();
}

/** Keep only rows under a bench heading with the requested hearing date. */
export function parseLhc(html, date, seat = 'Lahore') {
  const [year, month, day] = date.split('-');
  const dateLabel = `${day}-${month}-${year}`;
  let active = false;
  let bench;
  let courtRoom;
  let srNo;
  let section;
  const entries = [];
  for (const [, row] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const heading = row.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1];
    if (heading && /^\d{2}-\d{2}-\d{4}\b/.test(squashSpaces(heading))) {
      const [dateCell, benchType, ...headingLines] = heading.split(/<br\s*\/?>/i).map(squashSpaces).filter(Boolean);
      active = dateCell === dateLabel;
      const room = headingLines.find((line) => /(?:\bBlock\b|\bCourt(?:\s+Room)?\s+(?:No\.|\d))/i.test(line));
      courtRoom = room?.match(/\bCourt(?:\s+Room)?\s*(?:No\.?\s*)?\(?([A-Z]*\.?\d+[A-Z]?)\b/i)?.[1];
      bench = headingLines.filter((line) => line !== room).join(', ') || benchType;
      if (bench && seat !== 'Lahore') bench += ` (${seat})`;
      section = srNo = undefined;
      continue;
    }
    if (!active) continue;
    const label = row.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    if (label) {
      section = squashSpaces(label);
      srNo = undefined;
      continue;
    }
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => squashSpaces(cell[1]));
    const [serial, category, raw, title] = cells;
    if (cells.length < 6 || !raw || !/\d/.test(raw) || !/^(\d+|and)$/i.test(serial)) continue;
    if (/^\d+$/.test(serial)) srNo = Number(serial);
    entries.push({
      bench, courtRoom, srNo, caseNo: caseNumber(category, raw),
      title: title?.replace(/\s+(?:v\/?s\.?|versus)\s+/i, ' v. '),
      stage: cells.at(-1) || (section && /^supplementary|^urgent/i.test(section) ? section : undefined),
    });
  }
  return entries;
}

export async function fetchLhc(date) {
  const entries = [];
  const known = new Set();
  for (const feed of feeds) {
    const params = feed.params(date);
    if (!params) continue;
    for (const [location, seat] of Object.entries(seats)) {
      const query = new URLSearchParams({
        ...params, location, courtName: 'All Courts', bench: '', caseNumber: '',
        partyName: '', lawyerCode: '', lawyerName: '', lawyer_cnic: '', lawyer_mobile: '',
      });
      const url = `${base}/dynamic/${feed.result}?${query.toString().replaceAll('+', '%20')}`;
      try {
        const response = await politeFetch(url, { timeoutMs: 40_000 });
        const html = await response.text();
        if (looksLikeChallenge(response, html)) throw new Error('court returned a challenge');
        for (const entry of parseLhc(html, date, seat)) {
          const key = JSON.stringify([entry.bench, entry.courtRoom, entry.srNo, entry.caseNo]);
          if (known.has(key)) continue;
          known.add(key);
          entries.push(entry);
        }
      } catch (error) {
        log('lhc', `${seat} ${feed.result}: ${error.message}`);
      }
      await sleep(750);
    }
  }
  if (!entries.length) {
    log('lhc', `no entries found for ${date}`);
    return null;
  }
  return { source: `${base}/case_management/regular_cause_list`, entries };
}

/** The Punjab district CMS requires a CAPTCHA for each cause-list lookup. */
export async function fetchPunjab(date) {
  log('punjab-district', `manual lookup required for ${date}: the public form asks for a CAPTCHA`);
  return null;
}
