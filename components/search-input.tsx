import IconButton from '@/components/icon-button';
import { TEXT_STYLES } from '@/constants/typography';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
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

  borderless: {
    borderWidth: 0,
  },

  searchIcon: {
    marginRight: 10,
  },

  inputViewport: {
    flex: 1,
    minWidth: 0,
    height: Platform.OS === 'ios' ? 28 : 54,
    overflow: 'hidden',
  },

  input: {
    ...TEXT_STYLES.bodyLarge,
    flex: 1,
    minWidth: 0,
    height: Platform.OS === 'ios' ? 28 : 54,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

});
