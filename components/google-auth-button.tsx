import GoogleG from '@/assets/images/google-g.svg';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface GoogleAuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function GoogleAuthButton({
  onPress,
  disabled = false,
  loading = false,
}: GoogleAuthButtonProps) {
  const colors = useAppColors();

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.text}
          />
        ) : (
          <>
            <GoogleG
              width={18}
              height={18}
            />

            <Text
              style={[
                styles.label,
                { color: colors.text },
              ]}>
              Continue with Google
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
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },

  content: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  label: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.82,
  },

  disabled: {
    opacity: 0.5,
  },
});
