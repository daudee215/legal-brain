import type { CSSProperties } from 'react';

const MASK: CSSProperties = {
  maskImage: 'url(/brand/mark.png)',
  WebkitMaskImage: 'url(/brand/mark.png)',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
};

/**
 * The calligraphy mark alone, painted with the background colour you give it
 * (e.g. `bg-bronze/5`). Decorative — use it for watermarks.
 */
export function BrandMark({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`pointer-events-none block select-none ${className}`} style={{ ...MASK, ...style }} />;
}

/**
 * Wakeel Pro logo: the calligraphy mark (drawn as a CSS mask so it takes the text colour and
 * follows dark mode) plus the wordmark in the display serif.
 */
export function Logo({ light = false, size = 'md' }: { light?: boolean; size?: 'md' | 'lg' }) {
  // The mark is bottom-heavy (tall stroke up top, bowl below), so the wordmark sits a touch
  // below the box centre to line up with the mark's visual middle, as in the master artwork.
  const mark = size === 'lg' ? 'h-16 w-[4.4rem]' : 'h-12 w-[3.3rem]';
  const word = size === 'lg' ? 'text-2xl mt-2' : 'text-lg mt-1.5';
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className={`${mark} shrink-0 ${light ? 'bg-[#ead2bd]' : 'bg-bronze'}`} />
      <span className={`font-serif ${word} whitespace-nowrap font-semibold uppercase leading-none tracking-[0.08em] sm:tracking-[0.12em] ${light ? 'text-ivory' : 'text-ink'}`}>
        Wakeel <span className={light ? 'text-[#ead2bd]' : 'text-bronze'}>Pro</span>
      </span>
    </span>
  );
}
