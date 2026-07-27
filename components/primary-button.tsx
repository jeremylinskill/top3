import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { TYPOGRAPHY } from '@/constants/typography';
import {
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <Text
        style={[
          styles.buttonText,
          disabled && styles.buttonTextDisabled,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.text,
  },

  buttonDisabled: {
    backgroundColor: COLORS.border,
  },

  buttonText: {
    ...TYPOGRAPHY.headline,
    color: COLORS.white,
    textAlign: 'center',
  },

  buttonTextDisabled: {
    color: COLORS.tertiaryText,
  },
});