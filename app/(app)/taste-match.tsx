import AppText from '@/components/app-text';
import FollowButton from '@/components/follow-button';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import {
  TASTE_MATCH_RANK_COLORS,
} from '@/constants/colors';
import { SPACING } from '@/constants/spacing';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useBlock } from '@/context/block-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { getPublicProfilesByIds } from '@/lib/supabase/profiles';
import {
  getPublishedPosts,
  getPublishedPostsByUser,
} from '@/services/post-service';
import { getTasteRecommendationForUser } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
  SharedRankComparison,
} from '@/utils/calculate-taste-match';
import { useLocalSearchParams } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
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

  return `All ${categoryName}`;
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
  const colors = useAppColors();
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const { profile } = useProfile();
  const { blockedUserIds } = useBlock();
  useTop3();

  const isViewedUserBlocked =
    Boolean(userId) &&
    blockedUserIds.includes(userId!);

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingViewedUser,
    setIsLoadingViewedUser,
  ] = useState(true);

  const [
    hasViewedUserLoadError,
    setHasViewedUserLoadError,
  ] = useState(false);

  const [
    hasPostsLoadError,
    setHasPostsLoadError,
  ] = useState(false);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const [viewedUser, setViewedUser] =
    useState<UserProfile | null>(null);

  const [animatedScore, setAnimatedScore] =
    useState(0);

  const scoreAnimationFrame =
    useRef<number | null>(null);

  const trackedTasteMatchRef =
    useRef(false);

  useEffect(() => {
  let isMounted = true;

  async function loadViewedUser() {
    setIsLoadingViewedUser(true);
    setHasViewedUserLoadError(false);

    if (
      !userId ||
      userId === profile.id ||
      isViewedUserBlocked
    ) {
      if (isMounted) {
        setViewedUser(null);
        setIsLoadingViewedUser(false);
      }
      return;
    }

    try {
      const profiles =
        await getPublicProfilesByIds([
          userId,
        ]);

      if (isMounted) {
        setViewedUser(profiles[0] ?? null);
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to load taste match profile:',
          error
        );
      }

      if (isMounted) {
        setViewedUser(null);
        setHasViewedUserLoadError(true);
      }
    } finally {
      if (isMounted) {
        setIsLoadingViewedUser(false);
      }
    }
  }

  loadViewedUser();

  return () => {
    isMounted = false;
  };
}, [
  isViewedUserBlocked,
  loadAttempt,
  profile.id,
  userId,
]);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setHasPostsLoadError(false);

      if (isViewedUserBlocked) {
        if (isMounted) {
          setAllPosts([]);
          setIsLoading(false);
        }

        return;
      }

      try {
        const publishedPostsPromise =
          getPublishedPosts();

        const viewedUserPostsPromise = userId
          ? getPublishedPostsByUser(userId)
          : Promise.resolve([]);

        const [
          publishedPosts,
          viewedUserPosts,
        ] = await Promise.all([
          publishedPostsPromise,
          viewedUserPostsPromise,
        ]);

        const mergedPosts = [
          ...publishedPosts,
          ...viewedUserPosts.filter(
            (post) =>
              !publishedPosts.some(
                (publishedPost) =>
                  publishedPost.id === post.id
              )
          ),
        ];

        if (isMounted) {
          setAllPosts(mergedPosts);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load taste match:',
            error
          );
        }

        if (isMounted) {
          setAllPosts([]);
          setHasPostsLoadError(true);
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
  }, [
    isViewedUserBlocked,
    loadAttempt,
    userId,
  ]);

  const tasteMatch = useMemo(() => {
    if (
      !viewedUser ||
      isLoading ||
      isViewedUserBlocked
    ) {
      return null;
    }

return getTasteRecommendationForUser({
  posts: allPosts,
  profilesByUserId: {
    [viewedUser.id]: viewedUser,
  },
  currentUserId: profile.id,
  otherUserId: viewedUser.id,
});
  }, [
    allPosts,
    isLoading,
    isViewedUserBlocked,
    profile.id,
    viewedUser,
  ]);

  useEffect(() => {
    trackedTasteMatchRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (
      !tasteMatch ||
      trackedTasteMatchRef.current
    ) {
      return;
    }

    trackedTasteMatchRef.current = true;

    trackAnalyticsEvent(
      'taste_match_viewed'
    );
  }, [tasteMatch]);

  useEffect(() => {
    if (!tasteMatch) {
      setAnimatedScore(0);
      return;
    }

    const targetScore = Math.round(
      tasteMatch.score
    );
    const duration = 1700;
    const startTime = Date.now();

    if (scoreAnimationFrame.current !== null) {
      cancelAnimationFrame(
        scoreAnimationFrame.current
      );
    }

    setAnimatedScore(0);

    function animateScore() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(
        elapsed / duration,
        1
      );

      // Continuous ease-out curve that begins
      // slowing in the final third without
      // switching into a separate animation phase.
      const easedProgress =
        1 -
        Math.pow(
          1 - progress,
          2.4
        );

      setAnimatedScore(
        Math.round(
          targetScore * easedProgress
        )
      );

      if (progress < 1) {
        scoreAnimationFrame.current =
          requestAnimationFrame(
            animateScore
          );
      } else {
        scoreAnimationFrame.current = null;
      }
    }

    scoreAnimationFrame.current =
      requestAnimationFrame(animateScore);

    return () => {
      if (
        scoreAnimationFrame.current !== null
      ) {
        cancelAnimationFrame(
          scoreAnimationFrame.current
        );
        scoreAnimationFrame.current = null;
      }
    };
  }, [tasteMatch]);

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
  }: {
    title?: string;
    rank: number;
    sharedItems: string[];
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


    return (
      <View
        style={[
          styles.rankItem,
          isShared
            ? {
                backgroundColor:
                  TASTE_MATCH_RANK_COLORS[
                    rank - 1
                  ] ??
                  colors.tasteMatchBackground,
              }
            : {
                backgroundColor:
                  colors.secondarySurface,
              },
        ]}>
        <AppText
          variant="caption"
          tone={isShared ? 'onHighlight' : 'primary'}
          emphasis="strong"
          style={styles.rankNumber}>
          {rank}
        </AppText>

        <AppText
          variant="caption"
          tone={isShared ? 'onHighlight' : 'secondary'}
          emphasis={isShared ? 'heavy' : 'default'}
          style={styles.rankItemText}
          numberOfLines={2}>
          {title || 'Not ranked'}
        </AppText>

      </View>
    );
  }

  if (isLoadingViewedUser) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />

        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="small"
            color={colors.tertiaryText}
          />

          <AppText
            variant="body"
            tone="tertiary"
            style={styles.loadingText}>
            Calculating your taste match…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (
    hasViewedUserLoadError ||
    hasPostsLoadError
  ) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />

        <View style={styles.stateContainer}>
          <AppText
            variant="sectionTitle"
            style={styles.stateTitle}>
            Couldn’t load this Taste Match
          </AppText>

          <AppText
            variant="body"
            tone="tertiary"
            style={styles.stateText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={() =>
              setLoadAttempt(
                (current) => current + 1
              )
            }
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!viewedUser) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />

        <View style={styles.stateContainer}>
          <AppText
            variant="sectionTitle"
            style={styles.stateTitle}>
            Match unavailable
          </AppText>

          <AppText
            variant="body"
            tone="tertiary"
            style={styles.stateText}>
            This profile could not be loaded.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              size="small"
              color={colors.tertiaryText}
            />

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.loadingText}>
              Calculating your taste match…
            </AppText>
          </View>
        ) : !tasteMatch ? (
          <View style={styles.stateContainer}>
            <AppText
              variant="sectionTitle"
              style={styles.stateTitle}>
              Not enough overlap yet
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.stateText}>
              Publish more Top 3s to create a
              stronger comparison.
            </AppText>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.surface,
                },
              ]}>
              <View style={styles.avatarPair}>
                <View
                  style={[
                    styles.avatarFrame,
                    {
                      backgroundColor: colors.surface,
                    },
                    styles.currentUserAvatarFrame,
                  ]}>
                  <UserAvatar
                    displayName={profile.displayName}
                    avatarUrl={profile.avatarUrl}
                    size={48}
                    fontSize={19}
                  />
                </View>

                <View
                  style={[
                    styles.avatarFrame,
                    {
                      backgroundColor: colors.surface,
                    },
                    styles.otherUserAvatarFrame,
                  ]}>
                  <UserAvatar
                    displayName={viewedUser.displayName}
                    avatarUrl={viewedUser.avatarUrl}
                    size={48}
                    fontSize={19}
                  />
                </View>
              </View>

              <AppText
                variant="pageTitle"
                style={styles.pageTitle}>
                You & {viewedUser.displayName}
              </AppText>

              <AppText
                variant="headline"
                style={styles.scoreLabel}>
                Taste Match
              </AppText>

              <AppText
                variant="display"
                style={styles.score}>
                {animatedScore}%
              </AppText>

              <AppText
                variant="bodyBold"
                style={styles.summary}>
                {sharedPickCount === 1
                  ? 'You share 1 ranked pick.'
                  : `You share ${sharedPickCount} ranked picks.`}
              </AppText>
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
                        style={[
                          styles.comparisonCard,
                          {
                            backgroundColor:
                              colors.surface,
                          },
                        ]}>
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

                              <AppText
                                variant="sectionTitle"
                                style={styles.comparisonTitle}
                                numberOfLines={2}>
                                {getComparisonCardTitle(
                                  comparison.category,
                                  comparison.topic
                                )}
                              </AppText>
                            </View>
                          );
                        })()}

                        <View
                          style={
                            styles.columnHeaderRow
                          }>
                          <AppText
                            variant="label"
                            style={styles.columnHeader}>
                            You
                          </AppText>

                          <AppText
                            variant="label"
                            style={styles.columnHeader}>
                            {viewedUser.displayName}
                          </AppText>
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
              <View
                style={[
                  styles.stateCard,
                  {
                    backgroundColor: colors.surface,
                  },
                ]}>
                <AppText
                  variant="sectionTitle"
                  style={styles.stateCardTitle}>
                  No side-by-side lists yet
                </AppText>

                <AppText
                  variant="body"
                  tone="tertiary"
                  style={styles.stateCardText}>
                  You share some broader taste,
                  but you have not both published
                  a Top 3 in the same category and
                  topic yet.
                </AppText>
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

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  loadingText: {
    marginTop: SPACING.md,
  },

  stateTitle: {
    textAlign: 'center',
  },

  stateText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
  },

  avatarPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  avatarFrame: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  currentUserAvatarFrame: {
    zIndex: 2,
  },

  otherUserAvatarFrame: {
    marginLeft: -12,
    zIndex: 1,
  },

  pageTitle: {
    textAlign: 'center',
  },

  scoreLabel: {
    marginTop: SPACING.xl,
  },

  score: {
    marginTop: 2,
  },

  summary: {
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
    flex: 1,
    minWidth: 0,
  },

  columnHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  columnHeader: {
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
    borderRadius: 10,
  },

  rankNumber: {
    width: 22,
  },

  rankItemText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 0,
    marginRight: 5,
  },

  stateCard: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingVertical: 30,
    paddingHorizontal: 22,
    borderRadius: 18,
  },

  stateCardTitle: {
    textAlign: 'center',
  },

  stateCardText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },
});