import IconButton from '@/components/icon-button';
import { TEXT_STYLES } from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

type SearchInputProps = Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText'
> & {
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  borderless?: boolean;
};

export default function SearchInput({
  value,
  onChangeText,
  onClear,
  borderless = false,
  placeholder,
  placeholderTextColor,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType = 'search',
  accessibilityLabel,
  ...textInputProps
}: SearchInputProps) {
  const colors = useAppColors();
  const inputRef = useRef<TextInput>(null);

  const resolvedPlaceholderTextColor =
    placeholderTextColor ??
    colors.tertiaryText;

  function handleClear() {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  }

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: 'transparent',
          backgroundColor: colors.surface,
        },
        borderless && styles.borderless,
      ]}>
      <Ionicons
        name="search-outline"
        size={19}
        color={colors.secondaryText}
        style={styles.searchIcon}
      />

      <View style={styles.inputViewport}>
        <TextInput
          {...textInputProps}
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            resolvedPlaceholderTextColor
          }
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          multiline={false}
          clearButtonMode="never"
          underlineColorAndroid="transparent"
          accessibilityLabel={
            accessibilityLabel ?? placeholder
          }
        />
      </View>

      {value.length > 0 ? (
        <IconButton
          size="navigation"
          onPress={handleClear}
          accessibilityLabel="Clear search">
          <View style={styles.clearIconCircle}>
            <Ionicons
              name="close"
              size={18}
              color={colors.secondaryText}
            />
          </View>
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
  },

  borderless: {
    borderWidth: 0,
  },

  searchIcon: {
    marginRight: 10,
  },

  clearIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 127, 127, 0.16)',
  },

  inputViewport: {
    flex: 1,
    minWidth: 0,
    height: 54,
    justifyContent: 'center',
  },

  input: {
    ...TEXT_STYLES.bodyLarge,
    // iOS TextInput can shift typed text when given a custom lineHeight.
    ...(Platform.OS === 'ios' ? { lineHeight: undefined } : {}),
    flex: 1,
    minWidth: 0,
    height: 54,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
  },

});
