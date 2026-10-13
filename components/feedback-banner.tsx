import AppText from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

export type FeedbackKind =
  | 'success'
  | 'warning'
  | 'error';

type FeedbackBannerProps = {
  kind: FeedbackKind;
  title: string;
  message?: string;
  onDismiss: () => void;
};

export default function FeedbackBanner({
  kind,
  title,
  message,
  onDismiss,
}: FeedbackBannerProps) {
  const colors = useAppColors();
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: isDarkMode
            ? colors.highlightSurface
            : colors.black,
        },
      ]}>
      <View style={styles.content}>
        <AppText
          variant="headline"
          tone={
            kind === 'error'
              ? 'destructive'
              : isDarkMode
                ? 'onHighlight'
                : 'onDark'
          }>
          {title}
        </AppText>

        {message ? (
          <AppText
            variant="body"
            tone={isDarkMode ? 'onHighlight' : 'onDark'}
            style={styles.messageText}>
            {message}
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        hitSlop={12}
        style={styles.dismissButton}>
        <Ionicons
          name="close"
          size={22}
          color={
            isDarkMode
              ? colors.onHighlight
              : colors.white
          }
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },

  content: {
    flex: 1,
    gap: SPACING.xs,
  },

  messageText: {
    opacity: 0.75,
  },

  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
