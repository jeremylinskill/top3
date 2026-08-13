import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import {
  createCollection,
  getCollections,
  publishCollection,
  updateCollection,
} from '@/lib/supabase/collections';
import { hasSeenWelcome } from '@/services/onboarding-service';
import { router } from 'expo-router';
import {
  useEffect,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';


export default function IndexScreen() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
  } = useAuth();


  const {
    profile,
    isProfileLoading,
  } = useProfile();


  const {
    collection: onboardingCollection,
    isLoading: isOnboardingCollectionLoading,
    isPendingPublish,
    authIntent,
    clearAuthIntent,
    clearPendingPublish,
    clearCollection:
      clearOnboardingCollection,
  } = useOnboardingCollection();


  const isProcessingPendingPublish =
    useRef(false);


  useEffect(() => {
    if (
      isAuthLoading ||
      isOnboardingCollectionLoading
    ) {
      return;
    }


    let isMounted = true;


    async function publishPendingOnboardingCollection() {
      if (
        !user ||
        !onboardingCollection ||
        !isPendingPublish ||
        isProcessingPendingPublish.current
      ) {
        return false;
      }


      isProcessingPendingPublish.current = true;


      const collectionToPublish =
        onboardingCollection;

      const authenticatedUserId =
        user.id;


      try {
        const normalizedCategory =
          collectionToPublish.category
            .trim()
            .toLowerCase();

        const normalizedType =
          collectionToPublish.type
            ?.trim()
            .toLowerCase() ?? 'general';

        const normalizedTopic =
          collectionToPublish.topic
            ?.trim()
            .toLowerCase() ?? 'general';


        const existingCollections =
          await getCollections(
            authenticatedUserId
          );


        const existingCollection =
          existingCollections.find(
            (collection) => {
              const existingCategory =
                collection.category
                  .trim()
                  .toLowerCase();

              const existingType =
                collection.type
                  ?.trim()
                  .toLowerCase() ?? 'general';

              const existingTopic =
                collection.topic
                  ?.trim()
                  .toLowerCase() ?? 'general';


              return (
                existingCategory ===
                  normalizedCategory &&
                existingType ===
                  normalizedType &&
                existingTopic ===
                  normalizedTopic
              );
            }
          );


        const savedCollection =
          existingCollection
            ? await updateCollection(
                existingCollection.id,
                {
                  category:
                    collectionToPublish.category,
                  type:
                    collectionToPublish.type,
                  topic:
                    collectionToPublish.topic,
                  title:
                    collectionToPublish.title,
                  items:
                    collectionToPublish.items,
                }
              )
            : await createCollection({
                userId:
                  authenticatedUserId,
                category:
                  collectionToPublish.category,
                type:
                  collectionToPublish.type,
                topic:
                  collectionToPublish.topic,
                title:
                  collectionToPublish.title,
                items:
                  collectionToPublish.items,
              });


        await publishCollection(
          savedCollection.id
        );


        if (!isMounted) {
          return true;
        }


        const shouldReturnToFeed =
          authIntent === 'sign-in';


        clearAuthIntent();
        clearPendingPublish();
        clearOnboardingCollection();


        router.replace(
          shouldReturnToFeed
            ? '/(tabs)'
            : '/onboarding-published'
        );


        return true;
      } catch (error) {
        console.error(
          'Failed to publish pending onboarding collection:',
          error
        );


        if (isMounted) {
          isProcessingPendingPublish.current =
            false;

          clearPendingPublish();
        }


        return false;
      }
    }


    async function initializeApp() {
      try {
        if (isAuthenticated) {
          if (isProfileLoading) {
            return;
          }


          if (
            onboardingCollection &&
            isPendingPublish
          ) {
            await publishPendingOnboardingCollection();
            return;
          }


          const onboardingSelectedItemCount =
            onboardingCollection?.items.filter(
              (item) => item !== null
            ).length ?? 0;


          if (
            onboardingCollection &&
            onboardingSelectedItemCount > 0
          ) {
            router.replace('/collection');
            return;
          }


          if (profile.hasCompletedOnboarding) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }


          return;
        }


        const hasSeen =
          await hasSeenWelcome();


        if (!isMounted) {
          return;
        }


        if (
          onboardingCollection &&
          onboardingCollection.items.some(
            (item) => item !== null
          )
        ) {
          router.replace('/collection');
          return;
        }


        if (hasSeen) {
          router.replace('/sign-in');
        } else {
          router.replace('/welcome');
        }
      } catch (error) {
        console.error(
          'Failed to initialize app:',
          error
        );


        if (isMounted) {
          router.replace('/welcome');
        }
      }
    }


    void initializeApp();


    return () => {
      isMounted = false;
    };
  }, [
    authIntent,
    clearAuthIntent,
    clearOnboardingCollection,
    clearPendingPublish,
    isAuthenticated,
    isAuthLoading,
    isOnboardingCollectionLoading,
    isPendingPublish,
    isProfileLoading,
    onboardingCollection,
    profile.hasCompletedOnboarding,
    user,
  ]);


  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#222222"
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
