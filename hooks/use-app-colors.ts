import {
    AppColors,
    DARK_COLORS,
    LIGHT_COLORS,
} from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppColors(): AppColors {
  const colorScheme =
    useColorScheme();

  return colorScheme === 'dark'
    ? DARK_COLORS
    : LIGHT_COLORS;
}
