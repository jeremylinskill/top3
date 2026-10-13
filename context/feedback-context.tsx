import FeedbackBanner, {
  type FeedbackKind,
} from '@/components/feedback-banner';
import { SPACING } from '@/constants/spacing';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FeedbackMessage = {
  kind: FeedbackKind;
  title: string;
  message?: string;
};

type FeedbackContextValue = {
  showFeedback: (message: FeedbackMessage) => void;
  dismissFeedback: () => void;
};

const FeedbackContext =
  createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] =
    useState<FeedbackMessage | null>(null);

  const showFeedback = useCallback(
    (message: FeedbackMessage) => {
      setFeedback(message);
    },
    []
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!feedback || feedback.kind !== 'success') {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback((current) =>
        current === feedback ? null : current
      );
    }, 3000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  const value = useMemo(
    () => ({
      showFeedback,
      dismissFeedback,
    }),
    [showFeedback, dismissFeedback]
  );

  return (
    <FeedbackContext.Provider value={value}>
      <View style={styles.container}>
        {children}

        {feedback ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.overlay,
              {
                bottom: insets.bottom + SPACING.lg,
              },
            ]}>
            <FeedbackBanner
              kind={feedback.kind}
              title={feedback.title}
              message={feedback.message}
              onDismiss={dismissFeedback}
            />
          </View>
        ) : null}
      </View>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      'useFeedback must be used within FeedbackProvider.'
    );
  }

  return context;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1000,
    elevation: 10,
  },
});
