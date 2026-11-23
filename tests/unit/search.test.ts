import { describe, expect, it } from 'vitest';
import { searchItems } from '../../src/lib/search';

const xs = [
  { t: 'Bail after arrest', b: 'Section 497 CrPC' },
  { t: 'Pre-arrest bail', b: 'Section 498 CrPC' },
  { t: 'Rent dispute', b: 'Punjab Rented Premises Act' },
];
const f = (x: { t: string; b: string }) => [x.t, x.b];

describe('searchItems', () => {
  it('needs every token, ignores case and extra spaces', () => {
    expect(searchItems(xs, '  BAIL  497 ', f)).toEqual([xs[0]]);
  });
  it('returns [] for an unmatched Urdu query without throwing', () => {
    expect(searchItems(xs, 'ضمانت', f)).toEqual([]);
  });
  it('empty query returns everything in order', () => {
    expect(searchItems(xs, '', f)).toEqual(xs);
  });
});
