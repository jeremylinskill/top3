import PrimaryButton from '@/components/primary-button';
import Top3Card from '@/components/top3-card';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import { getPublishedPostsByUser } from '@/lib/supabase/collections';
import { Post } from '@/types/post';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function OnboardingPublishedScreen() {
  const { currentList, posts } = useTop3();
  const { profile } = useProfile();
  const { user } = useAuth();

  const [
    fetchedPublishedPost,
    setFetchedPublishedPost,
  ] = useState<Post | null>(null);

  const [
    isLoadingPublishedPost,
    setIsLoadingPublishedPost,
  ] = useState(false);


  const titleOpacity =
    useRef(new Animated.Value(0)).current;
  const subtitleOpacity =
    useRef(new Animated.Value(0)).current;
  const cardOpacity =
    useRef(new Animated.Value(0)).current;
  const cardScale =
    useRef(new Animated.Value(0.975)).current;


  const localPublishedPost = useMemo<Post | null>(
    () => {
      if (!currentList) {
        return null;
      }


      const existingPost = posts.find(
        (post) =>
          post.collection.id === currentList.id
      );


      if (existingPost) {
        return existingPost;
      }


      const publishedAt =
        currentList.publishedAt ??
        new Date().toISOString();


      return {
        id: `post-${currentList.id}`,
        authorId: profile.id,
        collection: {
          ...currentList,
          publishedAt,
        },
        publishedAt,
        reactions: 0,
        comments: 0,
      };
    },
    [
      currentList,
      posts,
      profile.id,
    ]
  );


  const publishedPost =
    localPublishedPost ??
    fetchedPublishedPost;


  useEffect(() => {
    if (
      localPublishedPost ||
      !user
    ) {
      return;
    }


    let isCancelled = false;

    const authenticatedUserId = user.id;


    async function loadLatestPublishedPost() {
      setIsLoadingPublishedPost(true);


      try {
        const publishedPosts =
          await getPublishedPostsByUser(
            authenticatedUserId
          );


        if (isCancelled) {
          return;
        }


        setFetchedPublishedPost(
          publishedPosts[0] ?? null
        );
      } catch (error) {
        console.error(
          'Failed to load published onboarding collection:',
          error
        );


        if (!isCancelled) {
          setFetchedPublishedPost(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPublishedPost(false);
        }
      }
    }


    void loadLatestPublishedPost();


    return () => {
      isCancelled = true;
    };
  }, [
    localPublishedPost,
    user,
  ]);


  useEffect(() => {
    if (!publishedPost) {
      return;
    }


    titleOpacity.setValue(0);
    subtitleOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.975);


    Animated.sequence([
      Animated.delay(140),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(70),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    cardOpacity,
    cardScale,
    publishedPost,
    subtitleOpacity,
    titleOpacity,
  ]);


  function continueOnboarding() {
    router.replace(
      '/onboarding-taste-match'
    );
  }


  if (
    !publishedPost &&
    isLoadingPublishedPost
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator
            size="large"
            color="#222222"
          />
        </View>
      </SafeAreaView>
    );
  }


  if (!publishedPost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContent}>
          <Text style={styles.brand}>
            Top 3
          </Text>

          <Text style={styles.title}>
            Your taste is taking shape.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>
          Top 3
        </Text>


        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
            },
          ]}>
          Your taste is taking shape.
        </Animated.Text>


        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
            },
          ]}>
          Every collection you share helps build a picture of what you love.
        </Animated.Text>


        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: cardOpacity,
              transform: [
                {
                  scale: cardScale,
                },
              ],
            },
          ]}>
          <Top3Card
            post={publishedPost}
            author={profile}
            showAuthor={false}
          />
        </Animated.View>
      </View>


      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue"
          onPress={continueOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },


  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },


  brand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },


  title: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  subtitle: {
    marginTop: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    lineHeight: 24,
    color: '#777777',
    textAlign: 'center',
  },


  cardContainer: {
    width: '100%',
    marginTop: 30,
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});
