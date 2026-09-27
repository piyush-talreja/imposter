// "Sticker Party": die-cut stickers with thick ink outlines and hard drop
// shadows, slapped onto a warm cream table covered in confetti.

export const colors = {
  bg: '#FFF3DC',
  bgDeep: '#FFE7C2',
  ink: '#221B3A',
  inkSoft: '#5B5378',
  white: '#FFFFFF',
  paper: '#FFFBF2',

  pink: '#FF4F9A',
  yellow: '#FFD23F',
  blue: '#3D5AFE',
  mint: '#22C7A9',
  orange: '#FF7A1A',
  purple: '#9B5DE5',
} as const;

export const CONFETTI = [colors.pink, colors.yellow, colors.blue, colors.mint, colors.orange, colors.purple];

export const fonts = {
  /** Chunky bubble display, for headlines and big words. */
  display: 'BagelFatOne_400Regular',
  body: 'Fredoka_500Medium',
  bodyBold: 'Fredoka_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;

export const size = { small: 14, body: 17, lead: 20, title: 32, hero: 46, giant: 64 } as const;

/** Outline + hard offset shadow: the sticker look. */
export const OUTLINE = 3;
export const SHADOW = 5;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const TOUCH = 48;

export const ROLE_META = {
  villager: {
    label: 'Villager',
    emoji: '🏡',
    color: colors.mint,
    blurb: 'You’ve got the word. Spot who doesn’t.',
  },
  undercover: {
    label: 'Undercover',
    emoji: '🕶️',
    color: colors.orange,
    blurb: 'Your word is close… but not quite.',
  },
  imposter: { label: 'Imposter', emoji: '🎭', color: colors.pink, blurb: 'No word at all. Fake it!' },
} as const;

/** Readable text color on a colored sticker (yellow is too light for white text). */
export const onColor = (bg: string) => (bg === colors.yellow ? colors.ink : colors.white);
