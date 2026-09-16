import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
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
  titleStyle?: StyleProp<TextStyle>;
}

export default function AuthProviderButton({
  title,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
  style,
  titleStyle,
}: AuthProviderButtonProps) {
  const colors = useAppColors();

  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const foregroundColor = isPrimary
    ? isDisabled
      ? colors.disabledText
      : colors.onPrimary
    : colors.text;

  const titleTone = isPrimary
    ? isDisabled
      ? 'disabled'
      : 'onPrimary'
    : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary
            ? isDisabled
              ? colors.disabledBackground
              : colors.primary
            : colors.surface,
          borderColor: isPrimary
            ? 'transparent'
            : colors.border,
          borderWidth: isPrimary
            ? 0
            : 1,
        },
        style,
        isDisabled &&
          !isPrimary &&
          styles.secondaryButtonDisabled,
        pressed &&
          !isDisabled &&
          styles.pressed,
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
              />
            ) : null}

            <AppText
              variant="bodyLarge"
              tone={titleTone}
              emphasis="semibold"
              style={[
                styles.title,
                titleStyle,
              ]}>
              {title}
            </AppText>
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

  secondaryButtonDisabled: {
    opacity: 0.5,
  },

  content: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  title: {
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.75,
  },
});
