import PrimaryButton from '@/components/primary-button';
import { useAppColors } from '@/hooks/use-app-colors';
import { router } from 'expo-router';
import {
  useEffect,
  useRef,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEMO_OVERALL_ITEMS = [
  'The Shawshank Redemption',
  'The Godfather',
  'Fight Club',
];

const DEMO_TOPICS = [
  'Horror',
  'Comedy',
  'Sci-Fi',
  'Action',
  'Drama',
];

export default function OnboardingOverallTop3Screen() {
  const colors = useAppColors();

  const titleOpacity =
    useRef(new Animated.Value(0)).current;
  const subtitleOpacity =
    useRef(new Animated.Value(0)).current;
  const cardOpacity =
    useRef(new Animated.Value(0)).current;
  const cardScale =
    useRef(new Animated.Value(0.975)).current;
  const topicsOpacity =
    useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(70),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(70),
      Animated.timing(topicsOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    cardOpacity,
    cardScale,
    subtitleOpacity,
    titleOpacity,
    topicsOpacity,
  ]);

  function continueOnboarding() {
    router.replace(
      '/onboarding-taste-match'
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <View style={styles.content}>
        <Text
          style={[
            styles.brand,
            {
              color: colors.text,
            },
          ]}>
          Top 3
        </Text>

        <Animated.Text
          style={[
            styles.title,
            {
              color: colors.text,
              opacity: titleOpacity,
            },
          ]}>
          See what rises to the top.
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              color: colors.tertiaryText,
              opacity: subtitleOpacity,
            },
          ]}>
          Every Top 3 helps shape the community rankings.
        </Animated.Text>

        <Animated.View
          style={[
            styles.overallCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: cardOpacity,
              transform: [
                {
                  scale: cardScale,
                },
              ],
            },
          ]}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardEyebrow,
                {
                  color: colors.tertiaryText,
                },
              ]}>
              OVERALL TOP 3
            </Text>

            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.text,
                },
              ]}>
              🎬 Movies
            </Text>
          </View>

          <View style={styles.rankingList}>
            {DEMO_OVERALL_ITEMS.map(
              (item, index) => (
                <View
                  key={item}
                  style={[
                    styles.rankingRow,
                    index <
                      DEMO_OVERALL_ITEMS.length - 1 && {
                      borderBottomWidth:
                        StyleSheet.hairlineWidth,
                      borderBottomColor:
                        colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.rank,
                      {
                        color: colors.text,
                      },
                    ]}>
                    {index + 1}
                  </Text>

                  <Text
                    style={[
                      styles.itemTitle,
                      {
                        color: colors.text,
                      },
                    ]}
                    numberOfLines={1}>
                    {item}
                  </Text>
                </View>
              )
            )}
          </View>

          <Text
            style={[
              styles.contributionText,
              {
                color: colors.tertiaryText,
              },
            ]}>
            Your picks help shape what appears here.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.topicsSection,
            {
              opacity: topicsOpacity,
            },
          ]}>
          <Text
            style={[
              styles.topicsLabel,
              {
                color: colors.secondaryText,
              },
            ]}>
            Explore rankings by category and genre
          </Text>

          <View style={styles.topicChips}>
            {DEMO_TOPICS.map((topic) => (
              <View
                key={topic}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor:
                      colors.secondarySurface,
                  },
                ]}>
                <Text
                  style={[
                    styles.topicChipText,
                    {
                      color: colors.secondaryText,
                    },
                  ]}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        <PrimaryButton
          title="Continue"
          onPress={continueOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  brand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    textAlign: 'center',
  },

  title: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },

  overallCard: {
    width: '100%',
    marginTop: 30,
    padding: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },

  cardHeader: {
    alignItems: 'center',
  },

  cardEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  cardTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },

  rankingList: {
    marginTop: 18,
  },

  rankingRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rank: {
    width: 34,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },

  itemTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },

  contributionText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  topicsSection: {
    marginTop: 24,
    alignItems: 'center',
  },

  topicsLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },

  topicChips: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  topicChipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
});
