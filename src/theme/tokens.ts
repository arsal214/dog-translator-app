// Source: Figma variables (Primitives → Color/Light). Updated to the navy + amber theme.
export const color = {
  canvas: '#F6F6F8',
  surface: '#FFFFFF',
  subtle: '#EEEFF3',
  brandSoft: '#FFF1CC', // cream/100
  brandFaint: '#FFF8E8', // cream/50
  brandStrong: '#22305A', // navy/900
  brandDeep: '#151D38', // navy/950 (dark canvases)
  highlight: '#FFD477',
  highlightSoft: '#FFF7E0',
  dangerSoft: '#FDECEA',
  primary: '#FDB515', // yellow/500
  primaryPressed: '#EAA000',
  disabled: '#E1E3EA',
  danger: '#D64535',
  text: '#1B2236',
  textSecondary: '#6B7385',
  textTertiary: '#A7ADBB',
  onBrand: '#FFFFFF',
  onBrandMuted: '#AEB8D4',
  onPrimary: '#22305A', // text/icons on the amber primary
  textAccent: '#8F5C00',
  textDanger: '#A8301F',
  textHighlight: '#7A5300',
  border: '#E1E3EA',
  borderSubtle: '#EEEFF3',
  borderBrand: '#EAA000',
} as const;

export const mood = {
  happy: { fg: '#FFD477', bg: '#FFF7E0' },
  excited: { fg: '#F59A4A', bg: '#FEF1E5' },
  calm: { fg: '#4C8DDB', bg: '#EAF2FC' },
  anxious: { fg: '#8B6CD9', bg: '#F1EDFB' },
  playful: { fg: '#12A878', bg: '#DDF7E9' },
  alert: { fg: '#D64535', bg: '#FDECEA' },
} as const;
export type Mood = keyof typeof mood;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48 } as const;
export const radius = { sm: 12, md: 18, lg: 24, xl: 32, full: 999 } as const;

// iOS Dynamic Type ramp from Foundations (size / line height).
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subheadStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.8 },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  buttonSmall: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  tab: { fontSize: 10, lineHeight: 12, fontWeight: '500' },
  numeric: { fontSize: 48, lineHeight: 52, fontWeight: '600' },
} as const;

export const shadow = {
  card: { shadowColor: '#22305A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  raised: { shadowColor: '#22305A', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  glow: { shadowColor: '#FDB515', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;
