import { useAuth } from '@/hooks/use-auth';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({
  children,
}: AuthGateProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}
