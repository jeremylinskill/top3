import { Ionicons } from '@expo/vector-icons';
import {
    Pressable,
    StyleSheet,
    Text,
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
  placeholderTextColor = '#A0A0A0',
  autoCapitalize = 'none',
  autoCorrect = false,
  returnKeyType = 'search',
  accessibilityLabel,
  ...textInputProps
}: SearchInputProps) {
  function handleClear() {
    onChangeText('');
    onClear?.();
  }

  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={19}
        color="#777777"
        style={styles.searchIcon}
      />

      <TextInput
        {...textInputProps}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        returnKeyType={returnKeyType}
        clearButtonMode="never"
        accessibilityLabel={
          accessibilityLabel ?? placeholder
        }
      />

      {value.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.clearButtonPressed,
          ]}>
          <Text style={styles.clearButtonText}>×</Text>
        </Pressable>
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
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: '#FFFFFF',
  },

  searchIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 16,
    color: '#222222',
  },

  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonPressed: {
    opacity: 0.55,
  },

  clearButtonText: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: '300',
    color: '#8A8A8A',
  },
});