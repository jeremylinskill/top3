import { TextStyle } from 'react-native';
import { COLORS } from './colors';

type TypographyKey =
  | 'display'
  | 'heroTitle'
  | 'pageTitle'
  | 'sectionTitle'
  | 'headline'
  | 'cardTitle'
  | 'bodyLarge'
  | 'body'
  | 'bodyBold'
  | 'subtitle'
  | 'label'
  | 'formLabel'
  | 'metadata'
  | 'caption'
  | 'action'
  | 'badgeTitle'
  | 'badgeSubtitle';

export const TYPOGRAPHY: Record<
  TypographyKey,
  TextStyle
> = {
  display: {
    fontSize: 62,
    lineHeight: 64,
    fontWeight: '800',
    color: COLORS.text,
  },

  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: COLORS.text,
  },

  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: COLORS.text,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: COLORS.text,
  },

  headline: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: COLORS.text,
  },

  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: COLORS.text,
  },

  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: COLORS.secondaryText,
  },

  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: COLORS.secondaryText,
  },

  bodyBold: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: COLORS.secondaryText,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
    color: COLORS.tertiaryText,
  },

  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.tertiaryText,
  },

  formLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.text,
  },

  metadata: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: COLORS.tertiaryText,
  },

  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORS.secondaryText,
  },

  action: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.accent,
  },

  badgeTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    color: COLORS.secondaryText,
  },

  badgeSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
    color: COLORS.tertiaryText,
  },
};