import {
    TEXT_STYLES,
    TypographyKey,
} from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';
import {
    Text,
    TextProps,
    TextStyle,
} from 'react-native';

export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'destructive'
  | 'tasteMatch'
  | 'onPrimary'
  | 'onHighlight'
  | 'disabled';

export type AppTextEmphasis =
  | 'default'
  | 'regular'
  | 'semibold'
  | 'strong'
  | 'heavy';

export type AppTextProps = TextProps & {
  variant?: TypographyKey;
  tone?: AppTextTone;
  emphasis?: AppTextEmphasis;
};

const DEFAULT_TONE_BY_VARIANT: Record<
  TypographyKey,
  AppTextTone
> = {
  display: 'primary',
  screenTitle: 'primary',
  welcomeBrand: 'primary',
  heroTitle: 'primary',
  heroSubtitle: 'secondary',
  tasteMatchSubtitle: 'secondary',
  onboardingSubtitle: 'secondary',
  pageTitle: 'primary',
  rankingTitle: 'primary',
  collectionTitle: 'primary',
  modalTitle: 'primary',
  emptyStateTitle: 'primary',
  sectionTitle: 'primary',
  selectionTitle: 'primary',
  matchScore: 'primary',
  comparisonRank: 'primary',
  comparisonLabel: 'primary',
  compactRankNumber: 'primary',
  rankNumber: 'primary',
  artworkInitial: 'tertiary',
  statValue: 'primary',
  stateTitle: 'primary',
  brand: 'primary',
  headline: 'primary',
  supportingText: 'primary',
  tasteMatchLabel: 'secondary',
  cardTitle: 'primary',
  bodyLarge: 'secondary',
  notificationBody: 'primary',
  body: 'secondary',
  bodyBold: 'secondary',
  legalBody: 'secondary',
  subtitle: 'tertiary',
  label: 'tertiary',
  formLabel: 'primary',
  metadata: 'tertiary',
  legalMeta: 'tertiary',
  micro: 'tertiary',
  microAction: 'secondary',
  input: 'primary',
  segmentLabel: 'secondary',
  caption: 'secondary',
  action: 'accent',
  badgeTitle: 'secondary',
  badgeSubtitle: 'tertiary',
};

const EMPHASIS_STYLES: Record<
  AppTextEmphasis,
  TextStyle
> = {
  default: {},
  regular: {
    fontWeight: '400',
  },
  semibold: {
    fontWeight: '600',
  },
  strong: {
    fontWeight: '700',
  },
  heavy: {
    fontWeight: '800',
  },
};

export default function AppText({
  variant = 'body',
  tone,
  emphasis = 'default',
  style,
  ...textProps
}: AppTextProps) {
  const colors = useAppColors();

  const resolvedTone =
    tone ?? DEFAULT_TONE_BY_VARIANT[variant];

  const color =
    resolvedTone === 'primary'
      ? colors.text
      : resolvedTone === 'secondary'
        ? colors.secondaryText
        : resolvedTone === 'tertiary'
          ? colors.tertiaryText
          : resolvedTone === 'accent'
            ? colors.accent
            : resolvedTone === 'destructive'
              ? colors.destructive
              : resolvedTone === 'tasteMatch'
                ? colors.tasteMatchAccent
                : resolvedTone === 'onPrimary'
                  ? colors.onPrimary
                  : resolvedTone === 'onHighlight'
                    ? colors.onHighlight
                    : colors.disabledText;

  return (
    <Text
      {...textProps}
      style={[
        TEXT_STYLES[variant],
        EMPHASIS_STYLES[emphasis],
        style,
        { color },
      ]}
    />
  );
}
