import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useComments } from '@/context/comment-context';
import { useLike } from '@/context/like-context';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
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
};

export default function Top3Card({
  post,
  author,
  showAuthor = true,
  onPress,
  onAuthorPress,
  onCommentsPress,
  onTitlePress,
  onEditPress,
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

  const publishedText = formatRelativeTime(
    post.publishedAt
  )?.replace(/^Updated\s+/i, '');

  const postIsLiked = isLiked(post.id);

  const displayedLikeCount = getLikeCount(
    post.id,
    post.reactions
  );

  const displayedCommentCount =
    getCommentCount(
      post.id,
      post.comments
    );

  const hasComments =
    displayedCommentCount > 0;

  function handleLikePress() {
    if (isLoadingLikes) {
      return;
    }

    toggleLike(post.id);
  }

  return (
    <View style={styles.card}>
      {showAuthor && author ? (
        <Pressable
          style={({ pressed }) => [
            styles.authorRow,
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
              ? `Browse ${post.collection.title}`
              : undefined
          }>
          <Text style={styles.categoryIcon}>
            {category?.icon ?? '⭐'}
          </Text>

          <Text style={styles.title}>
            {post.collection.title}
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
            accessibilityLabel={`Edit ${post.collection.title}`}>
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
            ? `Open post ${post.collection.title}`
            : undefined
        }>
        <View style={styles.ranking}>
          {post.collection.items.map(
            (item, index) => (
              <View
                key={`${post.id}-${index}`}
                style={[
                  styles.rankRow,
                  index < 2 &&
                    styles.rankDivider,
                ]}>
                <Text
                  style={styles.rankNumber}>
                  {index + 1}
                </Text>

                {item?.imageUrl ? (
                  <Image
                    source={{
                      uri: item.imageUrl,
                    }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={
                      styles.imagePlaceholder
                    }>
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color="#999999"
                    />
                  </View>
                )}

                <View
                  style={styles.itemDetails}>
                  <Text
                    style={styles.itemTitle}
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
              </View>
            )
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
                ? `Unlike ${post.collection.title}`
                : `Like ${post.collection.title}`
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
                ? `Open comments for ${post.collection.title}`
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

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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

  ranking: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },

  rankDivider: {
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },

  rankNumber: {
    width: 28,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  itemImage: {
    width: 64,
    height: 96,
    borderRadius: 9,
    backgroundColor: '#EEEEEE',
    marginRight: 13,
  },

  imagePlaceholder: {
    width: 64,
    height: 96,
    borderRadius: 9,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: '#222222',
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
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
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