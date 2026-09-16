import AppText from '@/components/app-text';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

export type ActionSheetActionVariant =
  | 'default'
  | 'destructive'
  | 'cancel';

export type ActionSheetAction = {
  label: string;
  onPress: () => void;
  variant?: ActionSheetActionVariant;
  disabled?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
};

export default function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: ActionSheetProps) {
  const colors = useAppColors();

  const showHeader =
    Boolean(title) || Boolean(message);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close action sheet"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
            },
          ]}>
          {showHeader ? (
            <View style={styles.header}>
              {title ? (
                <AppText
                  variant="pageTitle"
                  style={styles.title}>
                  {title}
                </AppText>
              ) : null}

              {message ? (
                <AppText
                  variant="body"
                  style={[
                    styles.message,
                    !title &&
                      styles.messageWithoutTitle,
                  ]}>
                  {message}
                </AppText>
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.actions,
              showHeader &&
                styles.actionsWithHeader,
            ]}>
            {actions.map(
              (
                action,
                index
              ) => {
                const variant =
                  action.variant ?? 'default';

                const isDestructive =
                  variant === 'destructive';

                const isCancel =
                  variant === 'cancel';

                const actionBackgroundColor =
                  isDestructive || isCancel
                    ? colors.surface
                    : colors.background;

                const actionBorderColor =
                  isDestructive
                    ? colors.destructive
                    : isCancel
                      ? colors.border
                      : 'transparent';

                const actionTextTone =
                  action.disabled
                    ? 'disabled'
                    : isDestructive
                      ? 'destructive'
                      : 'primary';

                return (
                  <Pressable
                    key={`${action.label}-${index}`}
                    disabled={action.disabled}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => {
                      action.onPress();
                    }}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        backgroundColor:
                          actionBackgroundColor,
                        borderColor:
                          actionBorderColor,
                        borderWidth:
                          isDestructive || isCancel
                            ? 1
                            : 0,
                      },
                      index > 0 &&
                        styles.actionButtonSpacing,
                      isCancel &&
                        styles.cancelSpacing,
                      action.disabled &&
                        styles.actionButtonDisabled,
                      pressed &&
                        !action.disabled &&
                        styles.actionButtonPressed,
                    ]}>
                    <AppText
                      variant="headline"
                      tone={actionTextTone}
                      style={styles.actionText}>
                      {action.label}
                    </AppText>
                  </Pressable>
                );
              }
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  sheet: {
    width: '100%',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    borderRadius: RADIUS.xxxl,
  },

  header: {
    alignItems: 'center',
  },

  title: {
    textAlign: 'center',
  },

  message: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  messageWithoutTitle: {
    marginTop: 0,
  },

  actions: {},

  actionsWithHeader: {
    marginTop: SPACING.xxl,
  },

  actionButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },

  actionButtonSpacing: {
    marginTop: SPACING.md,
  },

  cancelSpacing: {
    marginTop: SPACING.lg,
  },

  actionButtonPressed: {
    opacity: 0.72,
  },

  actionButtonDisabled: {
    opacity: 0.5,
  },

  actionText: {
    textAlign: 'center',
  },
});
