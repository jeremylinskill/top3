import AppText from '@/components/app-text';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useFollow } from '@/context/follow-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type FollowButtonSize =
  | 'small'
  | 'large';

type FollowButtonProps = {
  userId: string;
  size?: FollowButtonSize;
  style?: ViewStyle;
  disabled?: boolean;
  isFollowing?: boolean;
  isRequested?: boolean;
  isPrivate?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
};

export default function FollowButton({
  userId,
  size = 'large',
  style,
  disabled = false,
  isFollowing: controlledIsFollowing,
  isRequested = false,
  isPrivate = false,
  isLoading: controlledIsLoading,
  onPress,
}: FollowButtonProps) {
  const colors = useAppColors();

  const {
    isFollowing,
    toggleFollow,
    isLoading,
  } = useFollow();

  const normalizedUserId = userId.trim();

  const userIsFollowed =
    controlledIsFollowing ??
    (
      normalizedUserId.length > 0 &&
      isFollowing(normalizedUserId)
    );

  const buttonIsLoading =
    controlledIsLoading ?? isLoading;

  const buttonIsDisabled =
    disabled ||
    buttonIsLoading ||
    normalizedUserId.length === 0;

  const usesSecondaryStyle =
    userIsFollowed || isRequested;

  const buttonLabel = userIsFollowed
    ? 'Following'
    : isRequested
      ? 'Requested'
      : isPrivate
        ? 'Request to Follow'
        : 'Follow';

  function handlePress() {
    if (buttonIsDisabled) {
      return;
    }

    if (onPress) {
      onPress();
      return;
    }

    toggleFollow(normalizedUserId);
  }

  const foregroundColor =
    usesSecondaryStyle
      ? colors.text
      : colors.onPrimary;

  const textTone =
    usesSecondaryStyle
      ? 'primary'
      : 'onPrimary';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            usesSecondaryStyle
              ? colors.surface
              : colors.primary,
          borderColor:
            usesSecondaryStyle
              ? colors.border
              : 'transparent',
          borderWidth:
            usesSecondaryStyle
              ? 1
              : 0,
        },
        size === 'small'
          ? styles.smallButton
          : styles.largeButton,
        pressed &&
          !buttonIsDisabled &&
          styles.pressed,
        buttonIsDisabled &&
          styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={buttonIsDisabled}
      accessibilityRole="button"
      accessibilityState={{
        selected:
          userIsFollowed || isRequested,
        disabled: buttonIsDisabled,
      }}
      accessibilityLabel={
        userIsFollowed
          ? 'Unfollow this person'
          : isRequested
            ? 'Cancel follow request'
            : isPrivate
              ? 'Request to follow this person'
              : 'Follow this person'
      }>
      {buttonIsLoading ? (
        <ActivityIndicator
          size="small"
          color={foregroundColor}
        />
      ) : (
        <AppText
          variant={
            size === 'small'
              ? 'label'
              : 'bodyLarge'
          }
          tone={textTone}
          emphasis="strong"
          style={styles.buttonText}>
          {buttonLabel}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallButton: {
    minWidth: 82,
    minHeight: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
  },

  largeButton: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },

  buttonText: {
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.6,
  },
});
