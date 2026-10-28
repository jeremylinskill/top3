import AppText from '@/components/app-text';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // Optional custom content lets forms reuse this same sheet surface.
  children?: ReactNode;
  keyboardAvoiding?: boolean;
  dismissDisabled?: boolean;
};

export default function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
  children,
  keyboardAvoiding = false,
  dismissDisabled = false,
}: ActionSheetProps) {
  const colors = useAppColors();
  const previewColors = usePreviewSheetColors();
  const insets = useSafeAreaInsets();
  const invertedTextTone =
    useColorScheme() === 'dark'
      ? 'onHighlight'
      : 'onDark';

  const showHeader =
    Boolean(title) || Boolean(message);

  // Keep Android sheets clear of both three-button and gesture
  // navigation areas, including edge-to-edge modal layouts.
  // Preserve the existing iOS spacing.
  const overlayBottomPadding =
    Platform.OS === 'android'
      ? SPACING.xxl + Math.max(insets.bottom, 24)
      : SPACING.xxl;

  // iOS: move only this sheet with the keyboard, keeping the overlay and
  // floating bottom gap stable. KeyboardAvoidingView padding changes
  // the layout before the keyboard arrives, causing an abrupt jump.
  // Other ActionSheet instances opt out by default.
  const keyboardTranslateY = useRef(new Animated.Value(0)).current;
  const animateWithKeyboard = Platform.OS === 'ios' && keyboardAvoiding;

  useEffect(() => {
    if (!visible || !animateWithKeyboard) {
      keyboardTranslateY.stopAnimation();
      keyboardTranslateY.setValue(0);
      return;
    }

    const animateToFrame = (event: KeyboardEvent, hiding = false) => {
      const screenHeight = Dimensions.get('screen').height;
      const keyboardHeight = hiding
        ? 0
        : Math.max(
            0,
            Math.min(screenHeight,
              screenHeight - event.endCoordinates.screenY
            )
          );

      Animated.timing(keyboardTranslateY, {
        toValue: -keyboardHeight,
        duration: event.duration ?? 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start();
    };

    const frameSubscription = Keyboard.addListener(
      'keyboardWillChangeFrame',
      event => animateToFrame(event)
    );
    const hideSubscription = Keyboard.addListener(
      'keyboardWillHide',
      event => animateToFrame(event, true)
    );

    return () => {
      frameSubscription.remove();
      hideSubscription.remove();
      keyboardTranslateY.stopAnimation();
    };
  }, [visible, animateWithKeyboard, keyboardTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => {
        if (!dismissDisabled) onClose();
      }}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: previewColors.backdrop,
            paddingBottom: overlayBottomPadding,
          },
        ]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            disabled={dismissDisabled}
            accessibilityRole="button"
            accessibilityLabel="Close action sheet"
          />

          <Animated.View
            style={[
              styles.sheet,
              children != null && styles.sheetWithContent,
              {
                backgroundColor: previewColors.surface,
                transform: [{ translateY: keyboardTranslateY }],
              },
            ]}>
            {showHeader ? (
              <View style={styles.header}>
                {title ? (
                  <AppText
                    variant="modalTitle"
                    tone={invertedTextTone}
                    style={styles.title}>
                    {title}
                  </AppText>
                ) : null}

                {message ? (
                  <AppText
                    variant="body"
                    tone={invertedTextTone}
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

            {children != null ? (
              <ScrollView
                style={styles.customContent}
                contentContainerStyle={styles.customContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : null}

            <View
              style={[
                styles.actions,
                (showHeader || children != null) &&
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
                      ? previewColors.surface
                      : previewColors.control;

                  const actionBorderColor =
                    isDestructive
                      ? colors.destructive
                      : isCancel
                        ? previewColors.border
                        : 'transparent';

                  const actionTextTone =
                    isDestructive
                      ? 'destructive'
                      : invertedTextTone;

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
          </Animated.View>
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
  },

  sheet: {
    width: '100%',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    borderRadius: RADIUS.xxxl,
  },

  sheetWithContent: {
    maxHeight: '90%',
  },

  customContent: {
    flexShrink: 1,
  },

  customContentContainer: {
    paddingBottom: 2,
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
