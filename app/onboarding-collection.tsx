import CollectionScreen from './(app)/collection';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { Redirect } from 'expo-router';

export default function OnboardingCollectionRoute() {
  const {
    collection,
    isLoading,
  } = useOnboardingCollection();

  if (isLoading) {
    return null;
  }

  if (!collection) {
    return <Redirect href="/onboarding" />;
  }

  return <CollectionScreen />;
}
