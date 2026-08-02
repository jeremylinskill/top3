import GoogleG from '@/assets/images/google-g.svg';
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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#1F1F1F"
          />
        ) : (
          <>
            <GoogleG
              width={16}
              height={16}
            />

            <Text style={styles.label}>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775',
    borderRadius: 12,
  },

  content: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  label: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    color: '#1F1F1F',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.82,
  },

  disabled: {
    opacity: 0.5,
  },
});