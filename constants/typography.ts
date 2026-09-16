import { TextStyle } from 'react-native';

export type TypographyKey =
  | 'display'
  | 'screenTitle'
  | 'welcomeBrand'
  | 'heroTitle'
  | 'heroSubtitle'
  | 'tasteMatchSubtitle'
  | 'onboardingSubtitle'
  | 'pageTitle'
  | 'rankingTitle'
  | 'collectionTitle'
  | 'modalTitle'
  | 'emptyStateTitle'
  | 'sectionTitle'
  | 'selectionTitle'
  | 'matchScore'
  | 'comparisonRank'
  | 'comparisonLabel'
  | 'compactRankNumber'
  | 'rankNumber'
  | 'artworkInitial'
  | 'statValue'
  | 'stateTitle'
  | 'brand'
  | 'headline'
  | 'supportingText'
  | 'tasteMatchLabel'
  | 'cardTitle'
  | 'bodyLarge'
  | 'notificationBody'
  | 'body'
  | 'bodyBold'
  | 'legalBody'
  | 'subtitle'
  | 'label'
  | 'formLabel'
  | 'metadata'
  | 'legalMeta'
  | 'micro'
  | 'microAction'
  | 'input'
  | 'segmentLabel'
  | 'caption'
  | 'action'
  | 'badgeTitle'
  | 'badgeSubtitle';

/**
 * Canonical typography primitives.
 *
 * These styles intentionally contain no colors. Typography and semantic
 * color are separate design-system concerns.
 */
export const TEXT_STYLES: Record<
  TypographyKey,
  TextStyle
> = {
  display: {
    fontSize: 62,
    lineHeight: 64,
    fontWeight: '800',
  },

  screenTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
  },

  welcomeBrand: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '800',
  },

  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },

  heroSubtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
  },

  tasteMatchSubtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },

  onboardingSubtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },

  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },

  rankingTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },

  collectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },

  selectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },

  matchScore: {
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '800',
  },

  comparisonRank: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },

  comparisonLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },

  compactRankNumber: {
    fontSize: 17,
    fontWeight: '700',
  },

  rankNumber: {
    fontSize: 24,
    fontWeight: '700',
  },

  artworkInitial: {
    fontSize: 26,
    fontWeight: '700',
  },

  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },

  stateTitle: {
    fontSize: 22,
    fontWeight: '700',
  },

  brand: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  headline: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },

  supportingText: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '400',
  },

  tasteMatchLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },

  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  },

  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },

  notificationBody: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  },

  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },

  bodyBold: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },

  legalBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },

  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  formLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },

  metadata: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },

  legalMeta: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },

  micro: {
    fontSize: 12,
    fontWeight: '400',
  },

  microAction: {
    fontSize: 11,
    fontWeight: '600',
  },

  input: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },

  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  action: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },

  badgeTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
  },

  badgeSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
  },
};
