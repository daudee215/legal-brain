import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { enhancePixels, fitSize, imagesToPdf, movePage, scanFileName } from '../../src/lib/scan';

// A valid 1x1 baseline JPEG.
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  ),
  (c) => c.charCodeAt(0),
);

/** A dim grey "page" (value 150) with some dark "ink" (value 60), alpha varying per pixel. */
function dimPage(n = 400): Uint8ClampedArray {
  const d = new Uint8ClampedArray(n * 4);
  for (let p = 0; p < n; p++) {
    const v = p % 10 === 0 ? 60 : 150;
    d[p * 4] = v;
    d[p * 4 + 1] = v + 5;
    d[p * 4 + 2] = v - 5;
    d[p * 4 + 3] = p % 256;
  }
  return d;
}

describe('enhancePixels', () => {
  it('document mode lifts a dim grey page to white, darkens ink, keeps alpha', () => {
    const d = dimPage();
    const alpha = Array.from(d.filter((_, i) => i % 4 === 3));
    enhancePixels(d, 'document');
    // paper pixel
    expect(d[4]).toBeGreaterThan(240);
    expect(d[4]).toBe(d[5]);
    expect(d[5]).toBe(d[6]);
    // ink pixel stays dark
    expect(d[0]).toBeLessThan(40);
    expect(Array.from(d.filter((_, i) => i % 4 === 3))).toEqual(alpha);
  });

  it('document mode on a flat grey sheet still raises its white level', () => {
    const d = new Uint8ClampedArray(64 * 4).fill(140);
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    enhancePixels(d, 'document');
    expect(d[0]).toBeGreaterThan(240);
    expect(d[3]).toBe(255);
  });

  it('original mode leaves data unchanged', () => {
    const d = dimPage();
    const before = Array.from(d);
    enhancePixels(d, 'original');
    expect(Array.from(d)).toEqual(before);
  });
});

describe('fitSize', () => {
  it('downscales the longest side to the max', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1800, height: 1350 });
    expect(fitSize(3000, 4000, 1800)).toEqual({ width: 1350, height: 1800 });
  });
  it('never upscales', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('handles empty sizes', () => {
    expect(fitSize(0, 10)).toEqual({ width: 0, height: 0 });
  });
});

describe('imagesToPdf', () => {
  it('makes one A4 portrait page per image', async () => {
    const bytes = await imagesToPdf([
      { bytes: TINY_JPEG, width: 1, height: 1 },
      { bytes: TINY_JPEG, width: 1200, height: 1800 },
      { bytes: TINY_JPEG, width: 1800, height: 1200 },
    ]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });
});

describe('helpers', () => {
  it('movePage swaps neighbours and ignores out-of-range moves', () => {
    expect(movePage(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(movePage(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
  it('scanFileName adds .pdf and strips path characters', () => {
    expect(scanFileName('Order 3/4', 'Scan')).toBe('Order 3 4.pdf');
    expect(scanFileName('  ', 'Scan 1 Jan 2026')).toBe('Scan 1 Jan 2026.pdf');
    expect(scanFileName('x.PDF', 'Scan')).toBe('x.PDF');
  });
});
