// "Classified case file": cream dossiers on a dark walnut desk, rubber-stamp inks.

export const colors = {
  desk: '#14100D',
  deskLight: '#2A1F18',
  ink: '#1C1712',
  paper: '#EFE5CF',
  paperShade: '#E2D5B8',
  paperEdge: '#C9B994',
  cream: '#F6EEDC',
  muted: '#8E8069',
  mutedOnDark: '#A89A82',
  brass: '#C9A24A',
  redaction: '#0B0908',

  // Role inks
  villager: '#2E5A88',
  undercover: '#C98A12',
  imposter: '#C1121F',
  success: '#3D7A4A',
} as const;

export const fonts = {
  /** Dramatic noir-poster serif, for headlines only. */
  display: 'AbrilFatface_400Regular',
  /** Typewriter, for labels and body text. */
  type: 'SpecialElite_400Regular',
  /** Military stencil, for stamps and buttons. */
  stencil: 'BlackOpsOne_400Regular',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 14 } as const;

export const size = { small: 13, body: 16, lead: 19, title: 30, hero: 44, giant: 64 } as const;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const TOUCH = 48;

export const ROLE_META = {
  villager: { label: 'Villager', ink: colors.villager, blurb: 'You know the word. Find the ones who don’t.' },
  undercover: {
    label: 'Undercover',
    ink: colors.undercover,
    blurb: 'Your word was close, but not quite it.',
  },
  imposter: { label: 'Imposter', ink: colors.imposter, blurb: 'No word. Pure nerve.' },
} as const;
