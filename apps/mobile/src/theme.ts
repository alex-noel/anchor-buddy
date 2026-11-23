/** Semantic palette. Pair color with text or an icon wherever status is shown. */
export const semanticColors = {
  action: '#1765D1',
  actionLight: '#EDF4FF',
  information: '#1765D1',
  informationLight: '#EDF4FF',
  success: '#16704A',
  successLight: '#EAF5EF',
  warning: '#A15C00',
  warningLight: '#FFF4E5',
  error: '#B42335',
  errorLight: '#FDEDEF',
  neutral: '#475467',
  neutralLight: '#F0F2F5',
} as const;

export const colors = {
  ink: '#101828',
  muted: '#667085',
  paper: '#F4F6F9',
  white: '#FFFFFF',
  line: '#DCE2EA',
  ocean: '#DCE8F2',
  ...semanticColors,
  // Compatibility aliases for existing screens and components.
  green: semanticColors.action,
  mint: semanticColors.actionLight,
  orange: semanticColors.neutral,
  orangeLight: semanticColors.neutralLight,
  blue: semanticColors.action,
  red: semanticColors.error,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const textScale = {
  caption: 11,
  compact: 12,
  body: 14,
  bodyLarge: 16,
  heading: 20,
  title: 25,
} as const;

export const type = {
  title: {
    fontSize: textScale.title,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  heading: { fontSize: textScale.heading, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: textScale.body, color: colors.ink, lineHeight: 21 },
  bodyLarge: { fontSize: textScale.bodyLarge, color: colors.ink, lineHeight: 24 },
  label: { fontSize: textScale.compact, fontWeight: '600' as const, letterSpacing: 0.4 },
  caption: { fontSize: textScale.caption, color: colors.muted, lineHeight: 17 },
};
