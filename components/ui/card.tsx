import { useAppColors } from '@/hooks/use-app-colors';
import { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export default function Card({
  children,
  style,
}: CardProps) {
  const colors = useAppColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
  },
});
