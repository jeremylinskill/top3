import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useProfile } from '@/context/profile-context';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import {
  createCollection,
  getCollections,
  publishCollection,
  updateCollection,
} from '@/lib/supabase/collections';
import {
  hasSeenWelcome,
  isAwaitingEmailVerification,
} from '@/services/onboarding-service';
import { router } from 'expo-router';
import {
  useEffect,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
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


    if (
      isProcessingPendingPublish.current
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


        const {
          error: onboardingCompleteError,
        } = await supabase
          .from('profiles')
          .update({
            has_completed_onboarding: true,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', authenticatedUserId);


        if (onboardingCompleteError) {
          throw onboardingCompleteError;
        }


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


        const awaitingEmailVerification =
          await isAwaitingEmailVerification();


        if (!isMounted) {
          return;
        }


        if (awaitingEmailVerification) {
          router.replace('/check-email');
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
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error(
          'Failed to initialize app:',
          error
        );


        if (isMounted) {
          router.replace('/onboarding');
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


  const isFinishingOnboardingAccount =
    isAuthenticated &&
    Boolean(onboardingCollection) &&
    isPendingPublish;


  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#222222"
      />

      {isFinishingOnboardingAccount ? (
        <>
          <Text style={styles.title}>
            Verifying your email…
          </Text>

          <Text style={styles.description}>
            We&apos;re finishing your Top3 account.
          </Text>
        </>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },


  title: {
    marginTop: 24,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  description: {
    marginTop: 12,
    maxWidth: 340,
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
    textAlign: 'center',
  },
});