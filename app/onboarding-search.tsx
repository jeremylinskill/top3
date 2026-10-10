import SearchScreen from './(app)/search';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import {
  Redirect,
  useLocalSearchParams,
} from 'expo-router';

export default function OnboardingSearchRoute() {
  const {
    collection,
    isLoading,
  } = useOnboardingCollection();

  const params = useLocalSearchParams<{
    source?: string | string[];
  }>();

  const source = Array.isArray(params.source)
    ? params.source[0]
    : params.source;

  if (isLoading) {
    return null;
  }

  if (!collection || source !== 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <SearchScreen />;
}
