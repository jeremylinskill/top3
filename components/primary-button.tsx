import AppText from '@/components/app-text';
import { RADIUS } from '@/constants/radius';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  keepAppearanceWhenDisabled?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  keepAppearanceWhenDisabled = false,
  style,
}: PrimaryButtonProps) {
  const colors = useAppColors();
  const showDisabledAppearance =
    disabled && !keepAppearanceWhenDisabled;

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: showDisabledAppearance
            ? colors.disabledBackground
            : colors.primary,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <AppText
        variant="headline"
        tone={
          showDisabledAppearance
            ? 'disabled'
            : 'onPrimary'
        }
        style={styles.buttonText}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },

  buttonText: {
    textAlign: 'center',
  },
});
