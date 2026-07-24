import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useProfile } from '@/context/profile-context';
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
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublishedTop3Screen() {
  const { postId } = useLocalSearchParams<{
    postId?: string;
  }>();

  const { profile } = useProfile();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!postId) {
        if (isMounted) {
          setPost(null);
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);

      try {
        const posts = await getHydratedFeedPosts([]);

        const matchingPost =
          posts.find((item) => item.id === postId) ??
          null;

        if (isMounted) {
          setPost(matchingPost);
        }
      } catch (error) {
        console.error(
          'Failed to load published Top 3:',
          error
        );

        if (isMounted) {
          setPost(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading Top 3…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Top 3 Not Found"
          showBackButton
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This Top 3 is unavailable
          </Text>

          <Text style={styles.messageText}>
            It may have been removed or is no longer
            available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const author =
    post.authorId === profile.id
      ? profile
      : getMockUserById(post.authorId);

  function openAuthorProfile() {
    if (post.authorId === profile.id) {
      router.push('/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/public-profile',
      params: {
        userId: post.authorId,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {author ? (
          <Pressable
            style={styles.authorRow}
            onPress={openAuthorProfile}
            accessibilityRole="button"
            accessibilityLabel={`Open ${author.displayName}'s profile`}>
            <View style={styles.avatar}>
              {author.avatarUrl ? (
                <Image
                  source={{ uri: author.avatarUrl }}
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

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ) : null}

        <Top3Card
          post={post}
          author={author}
          showAuthor={false}
        />
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
    paddingBottom: 40,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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

  arrow: {
    fontSize: 30,
    color: '#999999',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {
    fontSize: 16,
    color: '#777777',
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