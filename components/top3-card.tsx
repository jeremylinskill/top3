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
  COLORS,
  TASTE_MATCH_RANK_COLORS,
} from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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



  return (
    <View style={styles.card}>
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
            <Text style={styles.recommendationTitle}>
              {recommendationTitle}
            </Text>
          </View>

          {recommendationReason ? (
            <Text
              style={styles.recommendationReason}
              numberOfLines={3}>
              {recommendationReason}
            </Text>
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
                <Text style={styles.authorName}>
                  {author.displayName}
                </Text>

                <Text style={styles.username}>
                  @{author.username}
                </Text>
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
                color="#666666"
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

          <Text style={styles.title}>
            {displayTitle}
          </Text>
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
              color="#666666"
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
              color="#666666"
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


              return (
                <View
                  key={`${post.id}-${index}`}
                  style={[
                    styles.rankRow,
                    index ===
                      post.collection.items.length - 1 &&
                      styles.lastRankRow,
                    !isHighlighted &&
                      styles.standardRankRow,
                    isHighlighted &&
                      styles.highlightedRankRow,
                    isTasteMatch && {
                      backgroundColor:
                        TASTE_MATCH_RANK_COLORS[
                          index
                        ] ??
                        COLORS.tasteMatchBackground,
                    },
                  ]}>
                  <Text
                    style={styles.rankNumber}>
                    {index + 1}
                  </Text>

                  <View
                    style={[
                      styles.artworkContainer,
                      {
                        width: artworkRule.width,
                        height: artworkRule.height,
                      },
                    ]}>
                    {item?.imageUrl ? (
                      <Image
                        source={{
                          uri: item.imageUrl,
                        }}
                        style={[
                          styles.itemImage,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                          },
                        ]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.imagePlaceholder,
                          {
                            width: artworkRule.width,
                            height: artworkRule.height,
                          },
                        ]}>
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color="#999999"
                        />
                      </View>
                    )}

                  </View>

                  <View
                    style={styles.itemDetails}>
                    <Text
                      style={[
                        styles.itemTitle,
                        isHighlighted &&
                          styles.highlightedItemTitle,
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail">
                      {item?.title ??
                        'Not selected'}
                    </Text>

                    {item?.subtitle ? (
                      <Text
                        style={
                          styles.itemSubtitle
                        }
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {item.subtitle}
                      </Text>
                    ) : null}

                    {typeof item?.rating ===
                    'number' ? (
                      <View
                        style={styles.ratingRow}>
                        <Text
                          style={
                            styles.ratingText
                          }>
                          {item.rating.toFixed(
                            1
                          )}
                        </Text>

                        <Ionicons
                          name="star"
                          size={13}
                          color="#555555"
                        />
                      </View>
                    ) : null}
                  </View>

                  {item ? (
                    <MediaPreviewItemButton
                      item={item}
                      category={post.collection.category}
                      style={styles.previewButton}
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
            color="#888888"
          />

          <Text style={styles.footerText}>
            {publishedText ?? 'Published'}
          </Text>
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
                  ? '#FF3B30'
                  : '#777777'
              }
            />

            <Text
              style={[
                styles.footerText,
                postIsLiked &&
                  styles.activeFooterText,
              ]}>
              {displayedLikeCount}
            </Text>
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
                  ? '#222222'
                  : '#777777'
              }
            />

            <Text
              style={[
                styles.footerText,
                hasComments &&
                  styles.activeFooterText,
              ]}>
              {displayedCommentCount}
            </Text>
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
                color="#777777"
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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

  recommendationTitle: {
    marginLeft: 0,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: COLORS.accent,
  },

  recommendationReason: {
    ...TYPOGRAPHY.metadata,
    marginTop: 1,
    marginLeft: 0,
    color: COLORS.accent,
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

  authorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 2,
    fontSize: 14,
    color: '#777777',
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: '#222222',
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },

  highlightedRankRow: {
    marginHorizontal: -10,
    paddingHorizontal: 10,
    backgroundColor: COLORS.tasteMatchBackground,
    borderRadius: 12,
  },


  rankNumber: {
    width: 28,
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
      textAlign: 'center',
        transform: [{ translateX: -5 }],
  },

  artworkContainer: {
    position: 'relative',
    marginRight: 13,
  },

  itemImage: {
    borderRadius: 9,
    backgroundColor: '#EEEEEE',
  },

  imagePlaceholder: {
    borderRadius: 9,
    backgroundColor: '#F0F0F0',
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
    backgroundColor: '#FFFFFF',
  },


  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    ...TYPOGRAPHY.cardTitle,
  },

  highlightedItemTitle: {
    fontWeight: '800',
  },

  itemSubtitle: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 4,
    color: COLORS.text,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingText: {
    marginRight: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
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
    fontSize: 13,
    color: '#777777',
  },

  activeFooterText: {
    color: '#222222',
    fontWeight: '600',
  },


  pressed: {
    opacity: 0.65,
  },

  disabled: {
    opacity: 0.5,
  },
});
