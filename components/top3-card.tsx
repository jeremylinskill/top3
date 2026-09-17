import AppText from '@/components/app-text';
import FollowButton from '@/components/follow-button';
import {
  MediaPreviewItemButton,
} from '@/components/media-preview-button';
import TasteMatchBadge from '@/components/taste-match-badge';
import UserAvatar from '@/components/user-avatar';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import {
  TASTE_MATCH_RANK_COLORS,
} from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  repairCollectionArtwork,
} from '@/lib/supabase/artwork-repair';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useRef,
  useState,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function getRenderableArtworkUrl(
  imageUrl?: string
): string | null {
  const trimmedImageUrl =
    imageUrl?.trim() ?? '';

  if (!trimmedImageUrl) {
    return null;
  }

  if (
    !/^https:\/\/covers\.openlibrary\.org\//i.test(
      trimmedImageUrl
    )
  ) {
    return trimmedImageUrl;
  }

  if (
    /[?&]default=/i.test(
      trimmedImageUrl
    )
  ) {
    return trimmedImageUrl.replace(
      /([?&])default=[^&]*/i,
      '$1default=false'
    );
  }

  return (
    trimmedImageUrl +
    (trimmedImageUrl.includes('?')
      ? '&'
      : '?') +
    'default=false'
  );
}

type Top3CardProps = {
  post: Post;
  author?: UserProfile | null;
  showAuthor?: boolean;
  onPress?: () => void;
  onAuthorPress?: () => void;
  onCommentsPress?: () => void;
  onSharePress?: () => void;
  onTitlePress?: () => void;
  onEditPress?: () => void;
  onMorePress?: () => void;
  highlightQuery?: string;
  tasteMatchItemTitles?: string[];
  recommendationTitle?: string;
  recommendationReason?: string;
  showFollowButton?: boolean;
  isFollowingAuthor?: boolean;
  isFollowLoading?: boolean;
  onFollowPress?: () => void;
  tasteMatchScore?: number;
  tasteMatchSharedPickCount?: number;
  onTasteMatchPress?: () => void;
};

export default function Top3Card({
  post,
  author,
  showAuthor = true,
  onPress,
  onAuthorPress,
  onCommentsPress,
  onSharePress,
  onTitlePress,
  onEditPress,
  onMorePress,
  highlightQuery,
  tasteMatchItemTitles = [],
  recommendationTitle,
  recommendationReason,
  showFollowButton = false,
  tasteMatchScore,
  tasteMatchSharedPickCount = 0,
  onTasteMatchPress,
}: Top3CardProps) {
  const colors = useAppColors();

  const {
    isLiked,
    toggleLike,
    getLikeCount,
    isLoading: isLoadingLikes,
  } = useLike();

  const {
    getCommentCount,
    isLoading: isLoadingComments,
  } = useComments();

  const [
    artworkOverrides,
    setArtworkOverrides,
  ] = useState<Record<string, string>>(
    {}
  );

  const [
    failedArtworkKeys,
    setFailedArtworkKeys,
  ] = useState<Set<string>>(
    () => new Set()
  );

  const attemptedArtworkRepairKeysRef =
    useRef<Set<string>>(
      new Set()
    );

  const category = TOP3_CATEGORIES.find(
    (item) =>
      item.id === post.collection.category
  );

  const artworkRule =
    getCategoryArtworkRule(
      post.collection.category
    );

  const displayTitle =
    post.collection.title.replace(
      /^Top 3\s+/i,
      ''
    );

  const publishedText = formatRelativeTime(
    post.publishedAt
  )?.replace(/^Updated\s+/i, '');

  const likeCollectionId = post.collection.id;

  const postIsLiked = isLiked(likeCollectionId);

  const displayedLikeCount = getLikeCount(
    likeCollectionId,
    post.reactions
  );

  const displayedCommentCount =
    getCommentCount(
      post.collection.id,
      post.comments
    );


  const hasComments =
    displayedCommentCount > 0;

  const normalizedHighlightQuery =
    highlightQuery?.trim().toLowerCase() ?? '';

  const normalizedTasteMatchItems = new Set(
    tasteMatchItemTitles
      .map((title) =>
        title.trim().toLowerCase()
      )
      .filter(Boolean)
  );

  function itemMatchesHighlight(
    title: string,
    subtitle?: string
  ) {
    if (!normalizedHighlightQuery) {
      return false;
    }

    const searchableText =
      `${title} ${subtitle ?? ''}`
        .trim()
        .toLowerCase();

    return searchableText.includes(
      normalizedHighlightQuery
    );
  }

  function handleLikePress() {
    if (isLoadingLikes) {
      return;
    }

    toggleLike(likeCollectionId);
  }

  function openRecommendationTasteMatch() {
    router.push({
      pathname: '/taste-match',
      params: {
        userId: post.authorId,
      },
    });
  }

  function handleArtworkLoadError(
    itemId: string,
    failedImageUrl: string
  ) {
    const failureKey =
      `${itemId}:${failedImageUrl}`;

    setFailedArtworkKeys(
      (currentKeys) => {
        if (
          currentKeys.has(
            failureKey
          )
        ) {
          return currentKeys;
        }

        const nextKeys =
          new Set(currentKeys);

        nextKeys.add(
          failureKey
        );

        return nextKeys;
      }
    );

    if (
      post.collection.category !==
      'books'
    ) {
      return;
    }

    const repairKey =
      `${post.collection.id}:${itemId}`;

    if (
      attemptedArtworkRepairKeysRef.current.has(
        repairKey
      )
    ) {
      return;
    }

    attemptedArtworkRepairKeysRef.current.add(
      repairKey
    );

    void repairCollectionArtwork(
      post.collection.id,
      itemId,
      {
        replaceExisting: true,
      }
    )
      .then((result) => {
        if (
          !result.repaired ||
          !result.imageUrl
        ) {
          return;
        }

        setArtworkOverrides(
          (currentOverrides) => ({
            ...currentOverrides,
            [itemId]:
              result.imageUrl as string,
          })
        );
      })
      .catch((error) => {
        if (__DEV__) {
          console.log(
            'Failed to repair broken book artwork:',
            error
          );
        }
      });
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
        },
      ]}>
      {recommendationTitle ? (
        <Pressable
          style={({ pressed }) => [
            styles.recommendationBlock,
            pressed && styles.pressed,
          ]}
          onPress={openRecommendationTasteMatch}
          accessibilityRole="button"
          accessibilityLabel="Open Taste Match details">
          <View style={styles.recommendationTitleRow}>
            <AppText
              variant="subtitle"
              tone="accent"
              emphasis="strong">
              {recommendationTitle}
            </AppText>
          </View>

          {recommendationReason ? (
            <AppText
              variant="metadata"
              tone="accent"
              style={styles.recommendationReason}
              numberOfLines={3}>
              {recommendationReason}
            </AppText>
          ) : null}
        </Pressable>
      ) : null}

      {showAuthor && author ? (
        <View style={styles.authorRow}>
          <View style={styles.authorContent}>
            <Pressable
              style={({ pressed }) => [
                styles.authorAction,
                pressed &&
                  onAuthorPress &&
                  styles.pressed,
              ]}
              onPress={onAuthorPress}
              disabled={!onAuthorPress}
              accessibilityRole={
                onAuthorPress
                  ? 'button'
                  : undefined
              }
              accessibilityLabel={
                onAuthorPress
                  ? `Open ${author.displayName}'s profile`
                  : undefined
              }>
              <UserAvatar
                displayName={author.displayName}
                avatarUrl={author.avatarUrl}
                size={46}
                fontSize={19}
              />

              <View style={styles.authorDetails}>
                <AppText
                  variant="headline"
                  tone="primary">
                  {author.displayName}
                </AppText>

                <AppText
                  variant="subtitle"
                  tone="secondary"
                  style={styles.username}>
                  @{author.username}
                </AppText>
              </View>
            </Pressable>

            {typeof tasteMatchScore ===
            'number' ? (
              <View style={styles.tasteMatchRow}>
                <TasteMatchBadge
                  score={tasteMatchScore}
                  sharedPickCount={
                    tasteMatchSharedPickCount
                  }
                  onPress={onTasteMatchPress}
                />
              </View>
            ) : null}
          </View>

          {showFollowButton ? (
            <FollowButton
              userId={author.id}
              size="small"
            />
          ) : null}

          {onMorePress ? (
            <Pressable
              style={({ pressed }) => [
                styles.moreButton,
                pressed && styles.pressed,
              ]}
              onPress={onMorePress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${displayTitle}`}>
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.secondaryText}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <Pressable
          style={({ pressed }) => [
            styles.titleAction,
            pressed &&
              onTitlePress &&
              styles.pressed,
          ]}
          onPress={onTitlePress}
          disabled={!onTitlePress}
          accessibilityRole={
            onTitlePress
              ? 'button'
              : undefined
          }
          accessibilityLabel={
            onTitlePress
              ? `Browse ${displayTitle}`
              : undefined
          }>
          <Text style={styles.categoryIcon}>
            {category?.icon ?? '⭐'}
          </Text>

          <AppText
            variant="collectionTitle"
            tone="primary"
            style={styles.title}>
            {displayTitle}
          </AppText>
        </Pressable>

        {onEditPress ? (
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
            onPress={onEditPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${displayTitle}`}>
            <Ionicons
              name="create-outline"
              size={20}
              color={colors.secondaryText}
            />
          </Pressable>
        ) : null}

        {!showAuthor && onMorePress ? (
          <Pressable
            style={({ pressed }) => [
              styles.moreButton,
              pressed && styles.pressed,
            ]}
            onPress={onMorePress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Open actions for ${displayTitle}`}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.secondaryText}
            />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          pressed &&
            onPress &&
            styles.pressed,
        ]}
        accessibilityRole={
          onPress ? 'button' : undefined
        }
        accessibilityLabel={
          onPress
            ? `Open post ${displayTitle}`
            : undefined
        }>
        <View style={styles.ranking}>
          {post.collection.items.map(
            (item, index) => {
              const isSearchHighlighted =
                item !== null &&
                itemMatchesHighlight(
                  item.title,
                  item.subtitle
                );

              const isTasteMatch =
                item !== null &&
                normalizedTasteMatchItems.has(
                  item.title
                    .trim()
                    .toLowerCase()
                );

              const isHighlighted =
                isSearchHighlighted ||
                isTasteMatch;

              const artworkUrl =
                item
                  ? artworkOverrides[
                      item.id
                    ] ??
                    item.imageUrl
                  : undefined;

              const renderableArtworkUrl =
                getRenderableArtworkUrl(
                  artworkUrl
                );

              const artworkFailureKey =
                item &&
                renderableArtworkUrl
                  ? `${item.id}:${renderableArtworkUrl}`
                  : null;

              const artworkHasFailed =
                artworkFailureKey
                  ? failedArtworkKeys.has(
                      artworkFailureKey
                    )
                  : false;

              return (
                <View
                  key={`${post.id}-${index}`}
                  style={[
                    styles.rankRow,
                    index ===
                      post.collection.items.length - 1 &&
                      styles.lastRankRow,
                    !isHighlighted && {
                      ...styles.standardRankRow,
                      backgroundColor:
                        colors.background,
                    },
                    isSearchHighlighted &&
                      !isTasteMatch && {
                        ...styles.highlightedRankRow,
                        backgroundColor:
                          colors.highlightedItemSurface,
                      },
                    isTasteMatch && {
                      ...styles.highlightedRankRow,
                      backgroundColor:
                        TASTE_MATCH_RANK_COLORS[
                          index
                        ] ??
                        colors.tasteMatchBackground,
                    },
                  ]}>
                  <AppText
                    variant="headline"
                    tone={
                      isTasteMatch
                        ? 'onHighlight'
                        : 'primary'
                    }
                    style={styles.rankNumber}>
                    {index + 1}
                  </AppText>

                  <View
                    style={[
                      styles.artworkContainer,
                      {
                        width: artworkRule.width,
                        height: artworkRule.height,
                      },
                    ]}>
                    {item &&
                    renderableArtworkUrl &&
                    !artworkHasFailed ? (
                      <Image
                        source={{
                          uri:
                            renderableArtworkUrl,
                        }}
                        style={[
                          styles.itemImage,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                          },
                        ]}
                        resizeMode="cover"
                        onError={() => {
                          handleArtworkLoadError(
                            item.id,
                            renderableArtworkUrl
                          );
                        }}
                      />
                    ) : (
                      <View
                        style={[
                          styles.imagePlaceholder,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                            backgroundColor:
                              isTasteMatch
                                ? colors.highlightPlaceholder
                                : colors.border,
                          },
                        ]}>
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color={
                            isTasteMatch
                              ? colors.highlightMuted
                              : colors.tertiaryText
                          }
                        />
                      </View>
                    )}

                  </View>

                  <View
                    style={styles.itemDetails}>
                    <AppText
                      variant="cardTitle"
                      tone={
                        isTasteMatch
                          ? 'onHighlight'
                          : 'primary'
                      }
                      emphasis={
                        isHighlighted
                          ? 'heavy'
                          : 'default'
                      }
                      numberOfLines={2}
                      ellipsizeMode="tail">
                      {item?.title ??
                        'Not selected'}
                    </AppText>

                    {item?.subtitle ? (
                      <AppText
                        variant="subtitle"
                        tone={
                          isTasteMatch
                            ? 'onHighlight'
                            : 'secondary'
                        }
                        style={styles.itemSubtitle}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {item.subtitle}
                      </AppText>
                    ) : null}

                    {typeof item?.rating ===
                    'number' ? (
                      <View
                        style={styles.ratingRow}>
                        <AppText
                          variant="caption"
                          tone={
                            isTasteMatch
                              ? 'onHighlight'
                              : 'primary'
                          }
                          style={styles.ratingText}>
                          {item.rating.toFixed(
                            1
                          )}
                        </AppText>

                        <Ionicons
                          name="star"
                          size={13}
                          color={
                            isTasteMatch
                              ? colors.onHighlight
                              : colors.secondaryText
                          }
                        />
                      </View>
                    ) : null}
                  </View>

                  {item ? (
                    <MediaPreviewItemButton
                      item={item}
                      category={post.collection.category}
                      style={[
                        styles.previewButton,
                        {
                          backgroundColor:
                            isTasteMatch
                              ? colors.highlightSurface
                              : colors.surface,
                        },
                      ]}
                      iconColor={
                        isTasteMatch
                          ? colors.onHighlight
                          : colors.secondaryText
                      }
                    />
                  ) : null}

                </View>
              );
            }
          )}
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons
            name="time-outline"
            size={15}
            color={colors.tertiaryText}
          />

          <AppText
            variant="metadata"
            tone="secondary"
            style={styles.footerText}>
            {publishedText ?? 'Published'}
          </AppText>
        </View>

        <View style={styles.engagement}>
          <Pressable
            style={({ pressed }) => [
              styles.footerItem,
              styles.engagementButton,
              pressed && styles.pressed,
              isLoadingLikes &&
                styles.disabled,
            ]}
            onPress={handleLikePress}
            disabled={isLoadingLikes}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{
              selected: postIsLiked,
              disabled: isLoadingLikes,
            }}
            accessibilityLabel={
              postIsLiked
                ? `Unlike ${displayTitle}`
                : `Like ${displayTitle}`
            }>
            <Ionicons
              name={
                postIsLiked
                  ? 'heart'
                  : 'heart-outline'
              }
              size={17}
              color={
                postIsLiked
                  ? colors.heart
                  : colors.secondaryText
              }
            />

            <AppText
              variant="metadata"
              tone={
                postIsLiked
                  ? 'primary'
                  : 'secondary'
              }
              emphasis={
                postIsLiked
                  ? 'semibold'
                  : 'default'
              }
              style={styles.footerText}>
              {displayedLikeCount}
            </AppText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.footerItem,
              styles.engagementButton,
              pressed &&
                onCommentsPress &&
                styles.pressed,
              isLoadingComments &&
                styles.disabled,
            ]}
            onPress={onCommentsPress}
            disabled={
              !onCommentsPress ||
              isLoadingComments
            }
            hitSlop={10}
            accessibilityRole={
              onCommentsPress
                ? 'button'
                : undefined
            }
            accessibilityState={{
              disabled:
                !onCommentsPress ||
                isLoadingComments,
            }}
            accessibilityLabel={
              onCommentsPress
                ? `Open comments for ${displayTitle}`
                : undefined
            }>
            <Ionicons
              name={
                hasComments
                  ? 'chatbubble'
                  : 'chatbubble-outline'
              }
              size={15}
              color={
                hasComments
                  ? colors.text
                  : colors.secondaryText
              }
            />

            <AppText
              variant="metadata"
              tone={
                hasComments
                  ? 'primary'
                  : 'secondary'
              }
              emphasis={
                hasComments
                  ? 'semibold'
                  : 'default'
              }
              style={styles.footerText}>
              {displayedCommentCount}
            </AppText>
          </Pressable>

          {onSharePress ? (
            <Pressable
              style={({ pressed }) => [
                styles.footerItem,
                styles.shareButton,
                pressed && styles.pressed,
              ]}
              onPress={onSharePress}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Share ${displayTitle}`}>
              <Ionicons
                name="share-outline"
                size={17}
                color={colors.secondaryText}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 18,
  },

  recommendationBlock: {
    marginTop: -18,
    marginHorizontal: -18,
    marginBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },

  recommendationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recommendationReason: {
    marginTop: 1,
    marginLeft: 0,
  },


  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  authorContent: {
    flex: 1,
    minWidth: 0,
  },

  authorAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  tasteMatchRow: {
    marginLeft: 58,
  },





  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },

  username: {
    marginTop: 2,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  titleAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIcon: {
    flexShrink: 0,
    marginRight: 9,
    fontSize: 22,
  },

  title: {
    flex: 1,
  },

  editButton: {
    width: 36,
    height: 36,
    marginLeft: 8,
    marginRight: -7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreButton: {
    width: 36,
    height: 36,
    marginLeft: 8,
    marginRight: -7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ranking: {},

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 15,
  },

  lastRankRow: {
    marginBottom: 0,
  },

  standardRankRow: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  highlightedRankRow: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },


  rankNumber: {
    width: 28,
    textAlign: 'center',
    transform: [{ translateX: -5 }],
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },

  itemImage: {
    borderRadius: 9,
  },

  imagePlaceholder: {
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewButton: {
    flexShrink: 0,
    width: 36,
    height: 36,
    marginLeft: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },


  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemSubtitle: {
    marginTop: 4,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingText: {
    marginRight: 4,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },

  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  engagementButton: {
    minHeight: 30,
    minWidth: 40,
    justifyContent: 'center',
  },

  shareButton: {
    minHeight: 30,
    minWidth: 30,
    justifyContent: 'center',
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerText: {
    marginLeft: 5,
  },


  pressed: {
    opacity: 0.65,
  },

  disabled: {
    opacity: 0.5,
  },
});
