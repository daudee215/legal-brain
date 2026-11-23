/** Unsplash photos (free licence), hot-linked from Unsplash's CDN — nothing is stored in the repo. */
const u = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMG = {
  justice: u('1589994965851-a8f479c573a9', 1400),
  justiceTexture: u('1589829545856-d10d557cf95f', 1400),
  library: u('1505664194779-8beaceb93744', 1800),
  signing: u('1450101499163-c8848c66ca85', 1400),
  books: u('1521587760476-6c12a4b040da', 1400),
};
