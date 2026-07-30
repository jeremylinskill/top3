import { useAuth } from '@/hooks/use-auth';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({
  children,
}: AuthGateProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});