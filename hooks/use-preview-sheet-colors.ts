import { useColorScheme } from 'react-native';

const PREVIEW_BACKDROP = 'rgba(0, 0, 0, 0.40)';

const DARK_PREVIEW_COLORS = {
  surface: '#111111',
  border: '#2A2A2A',
  control: '#2A2A2A',
  placeholder: '#2A2A2A',
  placeholderIcon: '#8A8A8A',
  primaryText: '#FFFFFF',
  bodyText: '#F2F2F2',
  secondaryText: '#D0D0D0',
  tertiaryText: '#B8B8B8',
  sourceText: '#A8A8A8',
  activity: '#F2F2F2',
  scrollIndicator: 'white' as const,
  backdrop: PREVIEW_BACKDROP,
};

const LIGHT_PREVIEW_COLORS = {
  surface: '#FFFFFF',
  border: '#E2E2E2',
  control: '#EEEEEE',
  placeholder: '#EEEEEE',
  placeholderIcon: '#8A8A8A',
  primaryText: '#111111',
  bodyText: '#1A1A1A',
  secondaryText: '#4A4A4A',
  tertiaryText: '#666666',
  sourceText: '#737373',
  activity: '#111111',
  scrollIndicator: 'black' as const,
  backdrop: PREVIEW_BACKDROP,
};

export function usePreviewSheetColors() {
  const colorScheme = useColorScheme();

  return colorScheme === 'dark'
    ? LIGHT_PREVIEW_COLORS
    : DARK_PREVIEW_COLORS;
}

export type PreviewSheetColors =
  ReturnType<typeof usePreviewSheetColors>;
