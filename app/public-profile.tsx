import CommentsSheet from '@/components/comments-sheet';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useFollow } from '@/context/follow-context';
import {
    getHydratedFeedPosts,
    getMockUserById,
} from '@/services/post-service';
import { Post } from '@/types/post';
import {
    router,
    useLocalSearchParams,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  const user = userId
    ? getMockUserById(userId)
    : null;

  const {
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const [publishedPosts, setPublishedPosts] =
    useState<Post[]>([]);

  const [isLoadingPosts, setIsLoadingPosts] =
    useState(true);

  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const userIsFollowed = userId
    ? isFollowing(userId)
    : false;

  useEffect(() => {
    let isMounted = true;

    async function loadPublishedPosts() {
      if (!userId) {
        if (isMounted) {
          setPublishedPosts([]);
          setIsLoadingPosts(false);
        }

        return;
      }

      setIsLoadingPosts(true);

      try {
        const hydratedPosts =
          await getHydratedFeedPosts([]);

        const userPosts = hydratedPosts
          .filter(
            (post) => post.authorId === userId
          )
          .sort(
            (first, second) =>
              new Date(
                second.publishedAt
              ).getTime() -
              new Date(
                first.publishedAt
              ).getTime()
          );

        if (isMounted) {
          setPublishedPosts(userPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load public profile posts:',
          error
        );

        if (isMounted) {
          setPublishedPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPosts(false);
        }
      }
    }

    loadPublishedPosts();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  function handleToggleFollowing() {
    if (!userId || isLoadingFollowState) {
      return;
    }

    toggleFollow(userId);
  }

  function openPost(postId: string) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId,
      },
    });
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Profile Not Found"
          showBackButton
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This profile is unavailable
          </Text>

          <Text style={styles.messageText}>
            The user may no longer exist or the
            profile could not be loaded.
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
        <View style={styles.identitySection}>
          <View style={styles.avatar}>
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {user.displayName
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.identityDetails}>
            <Text style={styles.displayName}>
              {user.displayName}
            </Text>

            <Text style={styles.username}>
              @{user.username}
            </Text>

            {user.bio ? (
              <Text
                style={styles.bio}
                numberOfLines={3}>
                {user.bio}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {publishedPosts.length}
            </Text>

            <Text style={styles.statLabel}>
              Top 3s
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {userIsFollowed ? 1 : 0}
            </Text>

            <Text style={styles.statLabel}>
              Followers
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              0
            </Text>

            <Text style={styles.statLabel}>
              Following
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.followButton,
            userIsFollowed &&
              styles.followingButton,
            pressed && styles.buttonPressed,
            isLoadingFollowState &&
              styles.buttonDisabled,
          ]}
          onPress={handleToggleFollowing}
          disabled={isLoadingFollowState}
          accessibilityRole="button"
          accessibilityState={{
            disabled: isLoadingFollowState,
            selected: userIsFollowed,
          }}
          accessibilityLabel={
            userIsFollowed
              ? `Unfollow ${user.displayName}`
              : `Follow ${user.displayName}`
          }>
          {isLoadingFollowState ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                userIsFollowed &&
                  styles.followingButtonText,
              ]}>
              {userIsFollowed
                ? 'Following'
                : 'Follow'}
            </Text>
          )}
        </Pressable>

        <View style={styles.section}>
          {isLoadingPosts ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>
                Loading Top 3s…
              </Text>
            </View>
          ) : publishedPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                Nothing published yet
              </Text>

              <Text style={styles.emptyStateText}>
                This person has not published any
                Top 3s yet.
              </Text>
            </View>
          ) : (
            <View style={styles.postList}>
              {publishedPosts.map((post) => (
                <Top3Card
                  key={post.id}
                  post={post}
                  author={user}
                  showAuthor={false}
                  onPress={() =>
                    openPost(post.id)
                  }
                  onCommentsPress={() =>
                    openComments(post)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <CommentsSheet
        visible={
          selectedCommentsPost !== null
        }
        post={selectedCommentsPost}
        onClose={closeComments}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    fontSize: 30,
    fontWeight: '700',
  },

  identityDetails: {
    flex: 1,
    marginLeft: 16,
  },

  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 2,
    fontSize: 16,
    color: '#777777',
  },

  bio: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#555555',
  },

  statsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    paddingVertical: 16,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  statLabel: {
    marginTop: 3,
    fontSize: 13,
    color: '#777777',
  },

  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: '#DDDDDD',
  },

  followButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },

  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  followButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },

  followingButtonText: {
    color: '#222222',
  },

  section: {
    marginTop: 20,
  },

  postList: {
    gap: 16,
  },

  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    fontSize: 16,
    color: '#777777',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
  },

  emptyStateText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});