import { AuthGate } from '@/components/auth-gate';
import { BlockGate } from '@/components/block-gate';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <AuthGate>
      <BlockGate>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </BlockGate>
    </AuthGate>
  );
}
