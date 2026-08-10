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
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
  },
});