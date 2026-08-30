import { COLORS } from '@/constants/colors';
import { TYPOGRAPHY } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type IoniconName = React.ComponentProps<
  typeof Ionicons
>['name'];

interface AuthProviderButtonProps {
  title: string;
  icon?: IoniconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AuthProviderButton({
  title,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
  style,
}: AuthProviderButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const foregroundColor = isPrimary
    ? isDisabled
      ? COLORS.tertiaryText
      : COLORS.white
    : COLORS.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? styles.primaryButton
          : styles.secondaryButton,
        style,
        isDisabled &&
          (isPrimary
            ? styles.primaryButtonDisabled
            : styles.secondaryButtonDisabled),
        pressed && !isDisabled && styles.pressed,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={foregroundColor}
          />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={22}
                color={foregroundColor}
                style={styles.icon}
              />
            ) : null}

            <Text
              style={[
                styles.title,
                isPrimary
                  ? styles.primaryTitle
                  : styles.secondaryTitle,
                isPrimary &&
                  isDisabled &&
                  styles.primaryTitleDisabled,
              ]}>
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
  },

  primaryButtonDisabled: {
    backgroundColor: COLORS.border,
  },

  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },

  secondaryButtonDisabled: {
    opacity: 0.5,
  },

  content: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    marginRight: 10,
  },

  title: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
    textAlign: 'center',
  },

  primaryTitle: {
    color: COLORS.white,
  },

  primaryTitleDisabled: {
    color: COLORS.tertiaryText,
  },

  secondaryTitle: {
    color: COLORS.text,
  },

  pressed: {
    opacity: 0.75,
  },
});