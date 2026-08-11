import FollowButton from '@/components/follow-button';
import TasteMatchBadge from '@/components/taste-match-badge';
import {
  getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { COLORS } from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useAudioPreview } from '@/context/audio-preview-context';
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
  onTitlePress?: () => void;
  onEditPress?: () => void;
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

function formatLabel(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export default function Top3Card({
  post,
  author,
  showAuthor = true,
  onPress,
  onAuthorPress,
  onCommentsPress,
  onTitlePress,
  onEditPress,
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

  const {
    activePreviewItemId,
    isPreviewPlaying,
    togglePreview,
  } = useAudioPreview();

  const category = TOP3_CATEGORIES.find(
    (item) =>
      item.id === post.collection.category
  );

  const categoryName =
    category?.name ??
    formatLabel(post.collection.category);

  const artworkRule =
    getCategoryArtworkRule(
      post.collection.category
    );

  const rawType =
    post.collection.type?.trim();

  const rawTopic =
    post.collection.topic?.trim();

  const normalizedTopic =
    rawTopic?.toLowerCase();

  const displayTitleParts = [
    categoryName,
    rawType
      ? formatLabel(rawType)
      : undefined,
    rawTopic &&
    normalizedTopic !== 'general'
      ? formatLabel(rawTopic)
      : undefined,
  ].filter(
    (value): value is string =>
      Boolean(value)
  );

  const displayTitle =
    displayTitleParts.join(' • ');

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
              <View style={styles.avatar}>
                {author.avatarUrl ? (
                  <Image
                    source={{
                      uri: author.avatarUrl,
                    }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {author.displayName
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>

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

                    {item?.previewUrl ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.previewButton,
                          pressed &&
                            styles.previewButtonPressed,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          void togglePreview(item);
                        }}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={
                          activePreviewItemId === item.id &&
                          isPreviewPlaying
                            ? `Pause preview of ${item.title}`
                            : `Play preview of ${item.title}`
                        }>
                        <Ionicons
                          name={
                            activePreviewItemId === item.id &&
                            isPreviewPlaying
                              ? 'pause'
                              : 'play'
                          }
                          size={18}
                          color="#FFFFFF"
                        />
                      </Pressable>
                    ) : null}
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

                  {isTasteMatch ? (
                    <Ionicons
                      name="sparkles"
                      size={14}
                      color={COLORS.sparkle}
                      style={styles.tasteMatchIcon}
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
    color: '#5928ed',
  },

  recommendationReason: {
    marginTop: 1,
    marginLeft: 0,
    fontSize: 13,
    lineHeight: 18,
    color: '#5928ed',
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





  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
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
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    marginTop: -18,
    marginLeft: -18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },

  previewButtonPressed: {
    opacity: 0.75,
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  tasteMatchIcon: {
    flexShrink: 0,
    marginLeft: 8,
    marginRight: 18,
  },

  itemTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: '#222222',
  },

  highlightedItemTitle: {
    fontWeight: '800',
  },

  itemSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#888888',
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
    color: '#555555',
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