import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
  getHydratedFeedPosts,
  getMockUserById,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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
  const [isLoadingFeed, setIsLoadingFeed] =
    useState(true);

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

    router.push({
      pathname: '/public-profile',
      params: {
        userId: authorId,
      },
    });
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
    <SafeAreaView
  style={styles.container}
  edges={['top', 'left', 'right']}>
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

            return (
              <Top3Card
                key={post.id}
                post={post}
                author={author}
                showAuthor
                onAuthorPress={() =>
                  openAuthorProfile(post.authorId)
                }
                onPress={() => openPost(post)}
              />
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
});