import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import { useFollow } from '@/context/follow-context';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
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
  isLoading?: boolean;
  onPress?: () => void;
};

export default function FollowButton({
  userId,
  size = 'large',
  style,
  disabled = false,
  isFollowing: controlledIsFollowing,
  isLoading: controlledIsLoading,
  onPress,
}: FollowButtonProps) {
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        size === 'small'
          ? styles.smallButton
          : styles.largeButton,
        userIsFollowed &&
          styles.followingButton,
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
        selected: userIsFollowed,
        disabled: buttonIsDisabled,
      }}
      accessibilityLabel={
        userIsFollowed
          ? 'Unfollow this person'
          : 'Follow this person'
      }>
      {buttonIsLoading ? (
        <ActivityIndicator
          size="small"
          color={
            userIsFollowed
              ? COLORS.text
              : COLORS.white
          }
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            size === 'small'
              ? styles.smallButtonText
              : styles.largeButtonText,
            userIsFollowed &&
              styles.followingButtonText,
          ]}>
          {userIsFollowed
            ? 'Following'
            : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.text,
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

  followingButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  buttonText: {
    ...TYPOGRAPHY.headline,
    color: COLORS.white,
    textAlign: 'center',
  },

  smallButtonText: {
    fontSize: 14,
  },

  largeButtonText: {
    fontSize: 16,
  },

  followingButtonText: {
    color: COLORS.text,
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.6,
  },
});