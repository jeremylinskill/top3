export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 18,

  // Cards
  card: 20,

  // Large surfaces (bottom sheets, full-width modals)
  xxxl: 24,

  // Fully rounded
  pill: 999,
} as const;

export type RadiusKey = keyof typeof RADIUS;