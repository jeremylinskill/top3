import { ViewStyle } from 'react-native';

export const SHADOWS: Record<
  'card' | 'floating',
  ViewStyle
> = {
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  floating: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
};