// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  SymbolViewProps,
  SymbolWeight,
} from 'expo-symbols';
import { ComponentProps } from 'react';
import {
  OpaqueColorValue,
  type StyleProp,
  type TextStyle,
} from 'react-native';

type SymbolName = Extract<
  SymbolViewProps['name'],
  string
>;

type MaterialIconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

type IconMapping = Record<
  SymbolName,
  MaterialIconName
>;

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right':
    'code',
  'chevron.right': 'chevron-right',
} as const satisfies Partial<IconMapping>;

type IconSymbolName =
  keyof typeof MAPPING;

/**
 * An icon component that uses Material Icons
 * on Android and web.
 *
 * Icon `name`s are based on SF Symbols and
 * require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}