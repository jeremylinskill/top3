import { TextStyle } from 'react-native';
import { COLORS } from './colors';

export const TYPOGRAPHY: Record<
  | 'display'
  | 'pageTitle'
  | 'sectionTitle'
  | 'headline'
  | 'body'
  | 'bodyBold'
  | 'label'
  | 'caption'
  | 'badgeTitle'
  | 'badgeSubtitle',
  TextStyle
> = {
  display: {
    fontSize: 62,
    lineHeight: 64,
    fontWeight: '800',
    color: COLORS.text,
  },

  pageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: COLORS.text,
  },

  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  headline: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    color: COLORS.text,
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

  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: COLORS.tertiaryText,
  },

  caption: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: COLORS.secondaryText,
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