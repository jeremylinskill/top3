import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
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

        <View style={styles.sheet}>
          {showHeader ? (
            <View style={styles.header}>
              {title ? (
                <Text style={styles.title}>
                  {title}
                </Text>
              ) : null}

              {message ? (
                <Text
                  style={[
                    styles.message,
                    !title &&
                      styles.messageWithoutTitle,
                  ]}>
                  {message}
                </Text>
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
                      index > 0 &&
                        styles.actionButtonSpacing,
                      isDestructive &&
                        styles.destructiveButton,
                      isCancel &&
                        styles.cancelButton,
                      isCancel &&
                        styles.cancelSpacing,
                      action.disabled &&
                        styles.actionButtonDisabled,
                      pressed &&
                        !action.disabled &&
                        styles.actionButtonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.actionText,
                        isDestructive &&
                          styles.destructiveText,
                        isCancel &&
                          styles.cancelText,
                        action.disabled &&
                          styles.actionTextDisabled,
                      ]}>
                      {action.label}
                    </Text>
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
    backgroundColor: COLORS.surface,
  },

  header: {
    alignItems: 'center',
  },

  title: {
    ...TYPOGRAPHY.pageTitle,
    color: COLORS.text,
    textAlign: 'center',
  },

  message: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    color: COLORS.secondaryText,
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
    backgroundColor: COLORS.background,
  },

  actionButtonSpacing: {
    marginTop: SPACING.md,
  },

  destructiveButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: COLORS.surface,
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: '#CFCFCF',
    backgroundColor: COLORS.surface,
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
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
    textAlign: 'center',
  },

  destructiveText: {
    color: '#FF3B30',
  },

  cancelText: {
    color: COLORS.text,
  },

  actionTextDisabled: {
    color: COLORS.tertiaryText,
  },
});