// "After Dark": a dim party room. Chunky stickers with black outlines and hard
// shadows on deep violet, lit by just three accents, one per role.

const pink = '#FF3D7F';
const cyan = '#2EE6D6';
const amber = '#FFB020';

export const colors = {
  bg: '#120E1F',
  surface: '#1E1832',
  raised: '#2A2345',
  outline: '#05030A',
  text: '#F4EFFF',
  textSoft: '#A89FC4',

  pink,
  cyan,
  amber,
  white: '#FFFFFF',
} as const;

/** The only accents in the app, and what each one means. */
export const ACCENTS = [pink, cyan, amber] as const;

export const fonts = {
  /** Tall, condensed nightclub-poster face for headlines and big words. */
  display: 'BigShouldersDisplay_900Black',
  body: 'Outfit_500Medium',
  bodyBold: 'Outfit_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;

export const size = { small: 14, body: 17, lead: 21, title: 34, hero: 50, giant: 68 } as const;

/** Outline + hard offset shadow: the sticker look. */
export const OUTLINE = 3;
export const SHADOW = 5;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const TOUCH = 48;

export const ROLE_META = {
  villager: { label: 'Villager', color: cyan, blurb: 'Has the word' },
  undercover: { label: 'Undercover', color: amber, blurb: 'Has a similar word' },
  imposter: { label: 'Imposter', color: pink, blurb: 'Has no word' },
} as const;

/** Readable text on an accent fill: dark on the bright cyan/amber, white on pink. */
export const onColor = (bg: string) => (bg === cyan || bg === amber ? colors.outline : colors.white);
