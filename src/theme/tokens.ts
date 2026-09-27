export const colors = {
  bg: '#0E0F1F',
  surface: '#1A1B35',
  surfaceRaised: '#25264A',
  border: '#34366A',
  text: '#F6F5FF',
  muted: '#A3A5C8',
  primary: '#7C5CFF',
  primaryText: '#FFFFFF',
  imposter: '#FF4D6D',
  success: '#2ED3A0',
  warning: '#FFC857',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const font = {
  small: 14,
  body: 17,
  title: 24,
  hero: 40,
  giant: 52,
} as const;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const TOUCH = 48;
