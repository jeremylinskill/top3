import FollowButton from '@/components/follow-button';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
    getHydratedFeedPosts,
    getMockUserById,
} from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import {
    SharedRankComparison,
} from '@/utils/calculate-taste-match';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

const COMPARISON_RANK_WEIGHTS = [3, 2, 1] as const;

function getComparisonRankMultiplier(
  firstRankIndex: number,
  secondRankIndex: number
) {
  const distance = Math.abs(
    firstRankIndex - secondRankIndex
  );

  if (distance === 0) {
    return 1;
  }

  if (distance === 1) {
    return 0.6;
  }

  return 0.35;
}

function getComparisonScore(
  comparison: SharedRankComparison
) {
  const currentItems =
    comparison.currentUserItems.map(
      normalizeValue
    );

  const otherItems =
    comparison.otherUserItems.map(
      normalizeValue
    );

  const maximumScore =
    COMPARISON_RANK_WEIGHTS.reduce(
      (total, weight) => total + weight,
      0
    );

  let earnedScore = 0;

  currentItems.forEach(
    (currentItem, currentRankIndex) => {
      const otherRankIndex =
        otherItems.indexOf(currentItem);

      if (otherRankIndex < 0) {
        return;
      }

      const currentWeight =
        COMPARISON_RANK_WEIGHTS[
          currentRankIndex
        ] ?? 0;

      const otherWeight =
        COMPARISON_RANK_WEIGHTS[
          otherRankIndex
        ] ?? 0;

      const averageWeight =
        (currentWeight + otherWeight) / 2;

      earnedScore +=
        averageWeight *
        getComparisonRankMultiplier(
          currentRankIndex,
          otherRankIndex
        );
    }
  );

  if (maximumScore === 0) {
    return 0;
  }

  return earnedScore / maximumScore;
}

function sortComparisons(
  comparisons: SharedRankComparison[]
) {
  return [...comparisons].sort(
    (first, second) => {
      const scoreDifference =
        getComparisonScore(second) -
        getComparisonScore(first);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      if (
        second.sharedItems.length !==
        first.sharedItems.length
      ) {
        return (
          second.sharedItems.length -
          first.sharedItems.length
        );
      }

      const categoryComparison =
        first.category.localeCompare(
          second.category
        );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return (
        first.topic ?? ''
      ).localeCompare(
        second.topic ?? ''
      );
    }
  );
}

function getCategoryDetails(
  categoryId: string
) {
  return TOP3_CATEGORIES.find(
    (category) =>
      normalizeValue(category.id) ===
      normalizeValue(categoryId)
  );
}

function getComparisonCardTitle(
  categoryId: string,
  topic?: string
) {
  const category =
    getCategoryDetails(categoryId);

  const categoryName =
    category?.name ??
    formatLabel(categoryId);

  const normalizedTopic =
    topic?.trim().toLowerCase();

  if (
    normalizedTopic &&
    normalizedTopic !== 'general'
  ) {
    return `${categoryName} • ${formatLabel(topic!)}`;
  }

  return categoryName;
}

function getSharedPickCount(
  comparisons: SharedRankComparison[]
) {
  return comparisons.reduce(
    (total, comparison) =>
      total + comparison.sharedItems.length,
    0
  );
}

export default function TasteMatchScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const { profile } = useProfile();
  const { posts } = useTop3();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const viewedUser = useMemo(() => {
    if (!userId || userId === profile.id) {
      return null;
    }

    return getMockUserById(userId);
  }, [profile.id, userId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);

      try {
        const hydratedPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setAllPosts(hydratedPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load taste match:',
          error
        );

        if (isMounted) {
          setAllPosts(posts);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const tasteMatch = useMemo(() => {
    if (!viewedUser || isLoading) {
      return null;
    }

    return getTasteRecommendationForUser({
      posts: allPosts,
      currentUserId: profile.id,
      otherUserId: viewedUser.id,
    });
  }, [
    allPosts,
    isLoading,
    profile.id,
    viewedUser,
  ]);

  const sharedPickCount = tasteMatch
    ? getSharedPickCount(
        tasteMatch.sharedRankComparisons
      )
    : 0;

  const sortedComparisons = useMemo(
    () =>
      tasteMatch
        ? sortComparisons(
            tasteMatch.sharedRankComparisons
          )
        : [],
    [tasteMatch]
  );

  function renderRankedItem({
    title,
    rank,
    sharedItems,
    matchingNumberOneItems,
  }: {
    title?: string;
    rank: number;
    sharedItems: string[];
    matchingNumberOneItems: string[];
  }) {
    const normalizedTitle =
      normalizeValue(title);

    const isShared =
      Boolean(normalizedTitle) &&
      sharedItems.some(
        (item) =>
          normalizeValue(item) ===
          normalizedTitle
      );

    const isMatchingNumberOne =
      rank === 1 &&
      Boolean(normalizedTitle) &&
      matchingNumberOneItems.some(
        (item) =>
          normalizeValue(item) ===
          normalizedTitle
      );

    return (
      <View
        style={[
          styles.rankItem,
          isShared && styles.sharedRankItem,
        ]}>
        <Text style={styles.rankNumber}>
          {rank}
        </Text>

        <Text
          style={[
            styles.rankItemText,
            isShared &&
              styles.sharedRankItemText,
          ]}
          numberOfLines={2}>
          {title || 'Not ranked'}
        </Text>

        {isMatchingNumberOne ? (
          <Ionicons
            name="trophy"
            size={15}
            color={COLORS.trophy}
          />
        ) : isShared ? (
          <Ionicons
            name="sparkles"
            size={16}
            color={COLORS.sparkle}
          />
        ) : null}
      </View>
    );
  }

  if (!viewedUser) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />

        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>
            Match unavailable
          </Text>

          <Text style={styles.stateText}>
            This profile could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              size="small"
              color={COLORS.tertiaryText}
            />

            <Text style={styles.loadingText}>
              Calculating your taste match…
            </Text>
          </View>
        ) : !tasteMatch ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateTitle}>
              Not enough overlap yet
            </Text>

            <Text style={styles.stateText}>
              Publish more Top 3s to create a
              stronger comparison.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.pageTitle}>
                You & {viewedUser.displayName}
              </Text>

              <Text style={styles.scoreLabel}>
  Taste Match
</Text>

<Text style={styles.score}>
  {Math.round(tasteMatch.score)}%
</Text>

              <Text style={styles.summary}>
                {sharedPickCount === 1
                  ? 'You share 1 ranked pick.'
                  : `You share ${sharedPickCount} ranked picks.`}
              </Text>
            </View>

            <View style={styles.followAction}>
              <FollowButton
                userId={viewedUser.id}
                size="large"
              />
            </View>

            {sortedComparisons.length > 0 ? (
              <View style={styles.comparisonList}>
                {sortedComparisons.map(
                  (comparison, index) => {
                    const rowCount = Math.max(
                      comparison.currentUserItems
                        .length,
                      comparison.otherUserItems
                        .length,
                      3
                    );

                    return (
                      <View
                        key={`${comparison.category}-${comparison.topic ?? 'general'}-${index}`}
                        style={styles.comparisonCard}>
                        {(() => {
                          const categoryDetails =
                            getCategoryDetails(
                              comparison.category
                            );

                          return (
                            <View
                              style={
                                styles.comparisonHeader
                              }>
                              <Text
                                style={
                                  styles.comparisonIcon
                                }>
                                {categoryDetails?.icon ??
                                  '⭐'}
                              </Text>

                              <Text
                                style={
                                  styles.comparisonTitle
                                }
                                numberOfLines={2}>
                                {getComparisonCardTitle(
                                  comparison.category,
                                  comparison.topic
                                )}
                              </Text>
                            </View>
                          );
                        })()}

                        <View
                          style={
                            styles.columnHeaderRow
                          }>
                          <Text
                            style={
                              styles.columnHeader
                            }>
                            You
                          </Text>

                          <Text
                            style={
                              styles.columnHeader
                            }>
                            {viewedUser.displayName}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.comparisonColumns
                          }>
                          <View
                            style={
                              styles.comparisonColumn
                            }>
                            {Array.from({
                              length: rowCount,
                            }).map((_, itemIndex) => (
                              <View
                                key={`current-${itemIndex}`}
                                style={
                                  itemIndex <
                                  rowCount - 1
                                    ? styles.rankItemSpacing
                                    : undefined
                                }>
                                {renderRankedItem({
                                  title:
                                    comparison
                                      .currentUserItems[
                                      itemIndex
                                    ],
                                  rank:
                                    itemIndex + 1,
                                  sharedItems:
                                    comparison.sharedItems,
                                  matchingNumberOneItems:
                                    tasteMatch.matchingNumberOneItems,
                                })}
                              </View>
                            ))}
                          </View>

                          <View
                            style={
                              styles.comparisonColumn
                            }>
                            {Array.from({
                              length: rowCount,
                            }).map((_, itemIndex) => (
                              <View
                                key={`other-${itemIndex}`}
                                style={
                                  itemIndex <
                                  rowCount - 1
                                    ? styles.rankItemSpacing
                                    : undefined
                                }>
                                {renderRankedItem({
                                  title:
                                    comparison
                                      .otherUserItems[
                                      itemIndex
                                    ],
                                  rank:
                                    itemIndex + 1,
                                  sharedItems:
                                    comparison.sharedItems,
                                  matchingNumberOneItems:
                                    tasteMatch.matchingNumberOneItems,
                                })}
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  }
                )}
              </View>
            ) : (
              <View style={styles.stateCard}>
                <Text style={styles.stateCardTitle}>
                  No side-by-side lists yet
                </Text>

                <Text style={styles.stateCardText}>
                  You share some broader taste,
                  but you have not both published
                  a Top 3 in the same category and
                  topic yet.
                </Text>
              </View>
            )}

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 20,
    paddingBottom: 40,
  },

  stateContainer: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: SPACING.xxl,
  },

  loadingText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
    color: COLORS.tertiaryText,
  },

  stateTitle: {
    ...TYPOGRAPHY.sectionTitle,
    textAlign: 'center',
  },

  stateText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: COLORS.sharedTaste,
    borderWidth: 1,
    borderColor: COLORS.sharedTasteBorder,
    borderRadius: 20,
  },

  pageTitle: {
    ...TYPOGRAPHY.pageTitle,
    textAlign: 'center',
  },

  scoreLabel: {
    ...TYPOGRAPHY.headline,
    marginTop: SPACING.xl,
    color: COLORS.secondaryText,
  },

  score: {
    ...TYPOGRAPHY.display,
    marginTop: 2,
  },

  summary: {
    ...TYPOGRAPHY.bodyBold,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  followAction: {
    marginTop: SPACING.lg,
  },

  comparisonList: {
    marginTop: SPACING.xl,
    gap: SPACING.xl,
  },

  comparisonCard: {
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  comparisonIcon: {
    flexShrink: 0,
    marginRight: 9,
    fontSize: 22,
  },

  comparisonTitle: {
    ...TYPOGRAPHY.pageTitle,
    flex: 1,
    minWidth: 0,
  },

  columnHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  columnHeader: {
    ...TYPOGRAPHY.label,
    flex: 1,
  },

  comparisonColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },

  comparisonColumn: {
    flex: 1,
    minWidth: 0,
  },

  rankItemSpacing: {
    marginBottom: 8,
  },

  rankItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },

  sharedRankItem: {
    backgroundColor: COLORS.sharedTaste,
  },

  rankNumber: {
    width: 28,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },

  rankItemText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
    marginRight: 5,
    color: COLORS.secondaryText,
  },

  sharedRankItemText: {
    fontWeight: '800',
    color: COLORS.text,
  },

  stateCard: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingVertical: 30,
    paddingHorizontal: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },

  stateCardTitle: {
    ...TYPOGRAPHY.sectionTitle,
    textAlign: 'center',
  },

  stateCardText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },
});