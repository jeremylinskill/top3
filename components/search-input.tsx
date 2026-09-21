import IconButton from '@/components/icon-button';
import { TEXT_STYLES } from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import {
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
};

export default function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder,
  placeholderTextColor,
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType = 'search',
  accessibilityLabel,
  ...textInputProps
}: SearchInputProps) {
  const colors = useAppColors();

  const resolvedPlaceholderTextColor =
    placeholderTextColor ??
    colors.tertiaryText;

  function handleClear() {
    onChangeText('');
    onClear?.();
  }

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}>
      <Ionicons
        name="search-outline"
        size={19}
        color={colors.secondaryText}
        style={styles.searchIcon}
      />

      <TextInput
        {...textInputProps}
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
        clearButtonMode="never"
        accessibilityLabel={
          accessibilityLabel ?? placeholder
        }
      />

      {value.length > 0 ? (
        <IconButton
          size="navigation"
          onPress={handleClear}
          accessibilityLabel="Clear search">
          <Ionicons
            name="close"
            size={26}
            color={colors.tertiaryText}
          />
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

  searchIcon: {
    marginRight: 10,
  },

  input: {
    ...TEXT_STYLES.bodyLarge,
    flex: 1,
    minHeight: 54,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

});
