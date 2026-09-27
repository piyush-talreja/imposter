import { useWindowDimensions } from 'react-native';

/** Screens are laid out in a centred column this wide (see Screen in ui.tsx). */
export const COLUMN = 560;

/** Average glyph width as a fraction of font size, padded so estimates err on the side of fitting. */
export const GLYPH = { display: 0.55, stencil: 0.95 } as const; // display: Big Shoulders caps measure ~0.48

/**
 * Largest font size (up to `base`) at which `text` fits in `width` pixels.
 * `wrap` fits the longest word instead of the whole string, for text that may
 * break across lines.
 *
 * We use this instead of `adjustsFontSizeToFit`: that is native-only, ignored on
 * web, and collapses text to a tiny size inside containers that size themselves
 * to their content (like a sticker or stamp).
 */
export function fitFontSize(
  text: string,
  base: number,
  width: number,
  { wrap = false, min = 14, glyph = GLYPH.display as number, letterSpacing = 0 } = {},
): number {
  const units = wrap ? Math.max(1, ...text.split(/\s+/).map((w) => w.length)) : Math.max(1, text.length);
  return Math.max(min, Math.min(base, Math.floor((width - units * letterSpacing) / (units * glyph))));
}

/** Width available inside the screen column after subtracting `inset` pixels of padding/borders. */
export function useColumnWidth(inset: number): number {
  const { width } = useWindowDimensions();
  return Math.max(120, Math.min(width, COLUMN) - inset);
}
