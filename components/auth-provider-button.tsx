import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
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
}

export default function AuthProviderButton({
  title,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
}: AuthProviderButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary'
          ? styles.primaryButton
          : styles.secondaryButton,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary'
                ? '#FFFFFF'
                : '#222222'
            }
          />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={22}
                color={
                  variant === 'primary'
                    ? '#FFFFFF'
                    : '#222222'
                }
                style={styles.icon}
              />
            ) : null}

            <Text
              style={[
                styles.title,
                variant === 'primary'
                  ? styles.primaryTitle
                  : styles.secondaryTitle,
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
    backgroundColor: '#1573DD',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9D9D9',
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },

  primaryTitle: {
    color: '#FFFFFF',
  },

  secondaryTitle: {
    color: '#222222',
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.5,
  },
});