import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Shared Create-list symbol used on cards and in bottom navigation. */
type ListPlusIconProps = {
  color: string;
  size?: number;
};

export default function ListPlusIcon({
  color,
  size = 20,
}: ListPlusIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no">
      <Path d="M3 6h13M3 12h8M3 18h13M18 9v6M15 12h6" />
    </Svg>
  );
}
