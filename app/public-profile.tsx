import ProfileScreen from '@/components/profile-screen';
import { useLocalSearchParams } from 'expo-router';

export default function PublicProfileRoute() {
  const params = useLocalSearchParams<{
    userId?: string | string[];
  }>();

  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;

  return (
    <ProfileScreen
      userId={userId}
      showBackButton
    />
  );
}