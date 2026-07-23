import ScreenHeader from '@/components/screen-header';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
  getHydratedFeedPosts,
  getMockUserById,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeedScreen() {
  const { profile } = useProfile();
  const { posts, selectList } = useTop3();

  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setFeedPosts(nextPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load feed posts:',
          error
        );

        if (isMounted) {
          setFeedPosts(posts);
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    loadFeedPosts();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  function getPostAuthor(
    authorId: string
  ): UserProfile | null {
    if (authorId === profile.id) {
      return profile;
    }

    return getMockUserById(authorId);
  }

  function openAuthorProfile(authorId: string) {
    if (authorId === profile.id) {
      router.push('/(tabs)/profile');
      return;
    }

    Alert.alert(
      'Public profile coming next',
      'We’ll build the read-only profile screen for other users next.'
    );
  }

  function openPost(post: Post) {
    const isCurrentUserPost =
      post.authorId === profile.id;

    if (isCurrentUserPost) {
      selectList(post.collection.id);
      router.push('/collection');
      return;
    }

    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoadingFeed ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>
              Loading feed…
            </Text>
          </View>
        ) : feedPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Nothing published yet
            </Text>

            <Text style={styles.emptyText}>
              Publish a completed Top 3 to see it here.
            </Text>
          </View>
        ) : (
          feedPosts.map((post) => {
            const author = getPostAuthor(
              post.authorId
            );

            if (!author) {
              return null;
            }

            const publishedText =
              formatRelativeTime(
                post.publishedAt
              )?.replace(/^Updated\s+/i, '');

            return (
              <View
                key={post.id}
                style={styles.postCard}>
                <Pressable
                  style={styles.postHeader}
                  onPress={() =>
                    openAuthorProfile(post.authorId)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${author.displayName}'s profile`}>
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

                <Pressable
                  style={styles.postContent}
                  onPress={() => openPost(post)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${post.collection.title}`}>
                  <Text style={styles.collectionTitle}>
                    {post.collection.title}
                  </Text>

                  <View style={styles.ranking}>
                    {post.collection.items.map(
                      (item, index) => (
                        <View
                          key={`${post.id}-${index}`}
                          style={styles.rankRow}>
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
                                styles.itemImagePlaceholder
                              }>
                              <Ionicons
                                name="image-outline"
                                size={22}
                                color="#999999"
                              />
                            </View>
                          )}

                          <View
                            style={styles.itemDetails}>
                            <Text
                              style={styles.itemTitle}
                              numberOfLines={2}>
                              {item?.title ??
                                'Not selected'}
                            </Text>

                            {item?.subtitle ? (
                              <Text
                                style={
                                  styles.itemSubtitle
                                }
                                numberOfLines={1}>
                                {item.subtitle}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )
                    )}
                  </View>
                </Pressable>

                <Text style={styles.postTime}>
                  {publishedText
                    ? `Published ${publishedText}`
                    : 'Published'}
                </Text>
              </View>
            );
          })
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },

  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {
    fontSize: 16,
    color: '#777777',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222222',
  },

  emptyText: {
    fontSize: 16,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 22,
  },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 20,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 20,
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

  postContent: {
    paddingBottom: 18,
  },

  collectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 18,
  },

  ranking: {
    gap: 14,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankNumber: {
    width: 28,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  itemImage: {
    width: 52,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    marginRight: 12,
  },

  itemImagePlaceholder: {
    width: 52,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  itemDetails: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#222222',
    fontWeight: '600',
  },

  itemSubtitle: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 19,
    color: '#888888',
  },

  postTime: {
    paddingTop: 14,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    fontSize: 13,
    color: '#888888',
  },
});