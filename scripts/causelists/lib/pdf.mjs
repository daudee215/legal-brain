/**
 * PDF text with positions, in Node, using the pdfjs-dist the app already depends on (legacy build = no DOM needed).
 * Returns one array of text runs per page: { x, y, s } with y measured from the bottom of the page.
 */
export async function pdfItems(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false, disableFontFace: true });
  const doc = await task.promise;
  const pages = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = [];
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue;
        items.push({ x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10, s: it.str });
      }
      pages.push(items);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

/** Rebuild plain text lines from positioned runs (same approach as the app's extractPdfText). */
export function itemsToLines(items) {
  const rows = [];
  for (const it of items) {
    let row = rows.find((r) => Math.abs(r.y - it.y) < 3);
    if (!row) {
      row = { y: it.y, parts: [] };
      rows.push(row);
    }
    row.parts.push(it);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((q) => q.s).join(' ').replace(/\s+/g, ' ').trim());
}
