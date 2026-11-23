import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { annexureLetter, buildPaperBook, planPaperBook } from '../../src/lib/paperBook';

async function makePdf(pages: number, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]).drawText(`${label} p${i + 1}`, { x: 50, y: 700, size: 14, font });
  return doc.save();
}

describe('annexureLetter', () => {
  it('runs A..Z then AA', () => {
    expect([0, 1, 2, 25, 26, 27].map(annexureLetter)).toEqual(['A', 'B', 'C', 'Z', 'AA', 'AB']);
  });
});

describe('planPaperBook', () => {
  it('counts the title and index pages before the documents', () => {
    const plan = planPaperBook([3, 2, 1]);
    expect(plan.frontPages).toBe(2);
    expect(plan.ranges).toEqual([
      [3, 5],
      [6, 7],
      [8, 8],
    ]);
    expect(plan.total).toBe(8);
  });
  it('uses more index pages for long books', () => {
    const plan = planPaperBook(Array(60).fill(1));
    expect(plan.frontPages).toBeGreaterThan(2);
    expect(plan.ranges[0][0]).toBe(plan.frontPages + 1);
  });
});

describe('buildPaperBook', () => {
  it('merges documents behind a title page and an index', async () => {
    const items = [
      { title: 'Main petition', bytes: await makePdf(3, 'petition') },
      { title: 'Impugned order', annexure: 'A', bytes: await makePdf(2, 'order') },
      { title: 'Notice — reply ’26', annexure: 'B', bytes: await makePdf(1, 'notice') },
    ];
    const out = await buildPaperBook({ caseTitle: 'Zahid Traders v. Federation of Pakistan', caseNo: 'W.P. 30112/2026', court: 'Lahore High Court', items });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2 + 3 + 2 + 1);
    expect(out.length).toBeGreaterThan(1000);
  });

  it('rejects an empty book', async () => {
    await expect(buildPaperBook({ caseTitle: 'x', caseNo: 'y', court: 'z', items: [] })).rejects.toThrow();
  });

  it('reports which file could not be read', async () => {
    await expect(
      buildPaperBook({ caseTitle: 'x', caseNo: 'y', court: 'z', items: [{ title: 'Broken', bytes: new Uint8Array([1, 2, 3]) }] }),
    ).rejects.toThrow(/Broken/);
  });
});
