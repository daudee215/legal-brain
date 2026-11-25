/**
 * Wakeel Pro logo: the calligraphy mark (drawn as a CSS mask so it takes the text colour and
 * follows dark mode) plus the wordmark in the display serif.
 */
export function Logo({ light = false, size = 'md' }: { light?: boolean; size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? 'h-12 w-14' : 'h-9 w-10';
  const word = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={`${mark} shrink-0 ${light ? 'bg-[#ead2bd]' : 'bg-bronze'}`}
        style={{
          maskImage: 'url(/brand/mark.png)',
          WebkitMaskImage: 'url(/brand/mark.png)',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
      <span className={`font-serif ${word} whitespace-nowrap font-semibold uppercase leading-none tracking-[0.08em] sm:tracking-[0.12em] ${light ? 'text-ivory' : 'text-ink'}`}>
        Wakeel <span className={light ? 'text-[#ead2bd]' : 'text-bronze'}>Pro</span>
      </span>
    </span>
  );
}
