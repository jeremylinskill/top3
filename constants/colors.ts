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
  background: '#F2F2F7',
  surface: '#FFFFFF',
  secondarySurface: '#ECECF1',
  controlSurface: '#E8E8ED',
  highlightedItemSurface: '#E2E2E8',

  skeleton: '#E4E4E9',
  skeletonSubtle: '#ECECF1',

  text: '#222222',
  secondaryText: '#666666',
  tertiaryText: '#888888',

  primary: PRIMARY_LIGHT,
  onPrimary: '#FFFFFF',

  onHighlight: '#111111',
  highlightSurface: '#FFFFFF',
  highlightPlaceholder: '#F0F0F0',
  highlightMuted: '#777777',

  disabledBackground: '#E8E8ED',
  disabledText: '#888888',

  accent: BRAND_ACCENT,
  destructive: '#FF3B30',

  tasteMatchAccent: BRAND_ACCENT,
  tasteMatchBackground: '#FFFC00',
  tasteMatchBorder: '#FFFC00',

  heart: '#FF4B4B',
  trophy: '#F5A623',
  sparkle: '#FFC83D',

  border: '#DEDEE4',

  black: '#111111',
  white: '#FFFFFF',
} as const;

export const DARK_COLORS = {
  background: '#171717',
  surface: '#000000',
  secondarySurface: '#242424',
  controlSurface: '#2A2A2A',
  highlightedItemSurface: '#242424',

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
    | typeof LIGHT_COLORS[Key]
    | typeof DARK_COLORS[Key];
};
