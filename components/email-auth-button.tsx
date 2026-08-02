import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface EmailAuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function EmailAuthButton({
  onPress,
  disabled = false,
  loading = false,
}: EmailAuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Email"
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
            <Ionicons
              name="mail-outline"
              size={16}
              color="#1F1F1F"
            />

            <Text style={styles.label}>
              Continue with Email
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
    gap: 7,
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