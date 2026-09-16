const BRAND_ACCENT = '#5928ED';

const BRAND_ACCENT_DARK = '#8B6CFF';

const PRIMARY_LIGHT = '#111111';

const PRIMARY_DARK = '#F5F5F5';

export const TASTE_MATCH_RANK_COLORS = [
  '#00D898',
  '#00D5CC',
  '#00D2FF',
] as const;

export const LIGHT_COLORS = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  secondarySurface: '#F1F1F1',
  skeleton: '#E8E8E8',
  skeletonSubtle: '#EEEEEE',
  text: '#222222',
  secondaryText: '#666666',
  tertiaryText: '#888888',
  primary: PRIMARY_LIGHT,
  onPrimary: '#FFFFFF',
  onHighlight: '#111111',
  highlightSurface: '#FFFFFF',
  highlightPlaceholder: '#F0F0F0',
  highlightMuted: '#777777',
  disabledBackground: '#EAEAEA',
  disabledText: '#888888',
  accent: BRAND_ACCENT,
  destructive: '#FF3B30',
  tasteMatchAccent: BRAND_ACCENT,
  tasteMatchBackground: '#FFFC00',
  tasteMatchBorder: '#FFFC00',
  heart: '#FF4B4B',
  trophy: '#F5A623',
  sparkle: '#FFC83D',
  border: '#EAEAEA',
  black: '#111111',
  white: '#FFFFFF',
} as const;

export const DARK_COLORS = {
  background: '#000000',
  surface: '#171717',
  secondarySurface: '#242424',
  skeleton: '#2A2A2A',
  skeletonSubtle: '#232323',
  text: '#F5F5F5',
  secondaryText: '#B0B0B0',
  tertiaryText: '#8A8A8A',
  primary: PRIMARY_DARK,
  onPrimary: '#000000',
  onHighlight: '#111111',
  highlightSurface: '#FFFFFF',
  highlightPlaceholder: '#F0F0F0',
  highlightMuted: '#777777',
  disabledBackground: '#2A2A2A',
  disabledText: '#8A8A8A',
  accent: BRAND_ACCENT_DARK,
  destructive: '#FF3B30',
  tasteMatchAccent: BRAND_ACCENT_DARK,
  tasteMatchBackground: '#FFFC00',
  tasteMatchBorder: '#FFFC00',
  heart: '#FF5A5A',
  trophy: '#F5A623',
  sparkle: '#FFC83D',
  border: '#2A2A2A',
  black: '#111111',
  white: '#FFFFFF',
} as const;

export type AppColors = {
  [Key in keyof typeof LIGHT_COLORS]:
    typeof LIGHT_COLORS[Key] | typeof DARK_COLORS[Key];
};
