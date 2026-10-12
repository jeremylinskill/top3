import AppText from '@/components/app-text';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useAppColors } from '@/hooks/use-app-colors';
import type {
  CollectionOption,
  CollectionOptionKind,
} from '@/types/collection-option';
import {
  destinationFromCollectionOption,
  NotificationDestination,
} from '@/types/notification-destination';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  selected: NotificationDestination | null;
  onSelect: (destination: NotificationDestination) => void;
  onClose: () => void;
};

// Podcasts are not part of the seven supported categories yet.
const categories = TOP3_CATEGORIES
  .filter((category) => category.id !== 'podcasts')
  .sort((a, b) => a.name.localeCompare(b.name));

export default function NotificationDestinationPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  const colors = useAppColors();
  const { options } = useCollectionOptions();

  const [categoryId, setCategoryId] =
    useState<CategoryId | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setCategoryId(null);
      setQuery('');
    }
  }, [visible]);

  const availableOptions = useMemo(
    () =>
      options
        .filter(
          (option) =>
            option.active &&
            categories.some(
              (category) => category.id === option.categoryId
            )
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base',
            numeric: true,
          })
        ),
    [options]
  );

  const currentCategory = categories.find(
    (category) => category.id === categoryId
  );

  const search = query.trim().toLowerCase();

  function matches(
    option: CollectionOption,
    categoryName: string
  ) {
    return (
      !search ||
      option.name.toLowerCase().includes(search) ||
      categoryName.toLowerCase().includes(search) ||
      option.kind.includes(search)
    );
  }

  function optionsFor(
    id: CategoryId,
    categoryName: string,
    kind: CollectionOptionKind
  ) {
    return availableOptions.filter(
      (option) =>
        option.categoryId === id &&
        option.kind === kind &&
        matches(option, categoryName)
    );
  }

  function choose(destination: NotificationDestination) {
    Keyboard.dismiss();
    onSelect(destination);
  }

  function renderChoice(
    label: string,
    destination: NotificationDestination,
    subtitle?: string
  ) {
    const isSelected =
      selected?.categoryId === destination.categoryId &&
      selected.kind === destination.kind &&
      (
        selected.kind === 'overall' ||
        (
          destination.kind !== 'overall' &&
          selected.optionId === destination.optionId
        )
      );

    const key =
      destination.kind === 'overall'
        ? `${destination.categoryId}-overall`
        : destination.optionId;

    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => choose(destination)}
        style={[
          styles.optionRow,
          { borderBottomColor: colors.border },
        ]}>
        <View style={styles.optionText}>
          <AppText variant="body">{label}</AppText>
          {subtitle ? (
            <AppText variant="label" tone="secondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {isSelected ? (
          <Ionicons
            name="checkmark"
            size={21}
            color={colors.primary}
          />
        ) : null}
      </Pressable>
    );
  }

  function sectionHeading(title: string) {
    return (
      <AppText
        variant="formLabel"
        style={styles.sectionHeading}>
        {title}
      </AppText>
    );
  }

  function renderCategory(
    category: (typeof categories)[number],
    isSearchResult = false
  ) {
    const types = optionsFor(
      category.id,
      category.name,
      'type'
    );
    const themes = optionsFor(
      category.id,
      category.name,
      'theme'
    );

    const includeOverall =
      !isSearchResult ||
      'overall'.includes(search) ||
      category.name.toLowerCase().includes(search) ||
      `overall ${category.name.toLowerCase()}`.includes(search);

    if (
      isSearchResult &&
      !includeOverall &&
      types.length === 0 &&
      themes.length === 0
    ) {
      return null;
    }

    return (
      <View key={category.id} style={styles.categorySection}>
        {isSearchResult
          ? sectionHeading(category.name)
          : null}

        {includeOverall ? (
          <View>
            {!isSearchResult ? sectionHeading('Overall') : null}
            {renderChoice(
              isSearchResult
                ? `Overall ${category.name}`
                : 'Overall',
              { categoryId: category.id, kind: 'overall' },
              isSearchResult ? 'Overall' : undefined
            )}
          </View>
        ) : null}

        {types.length > 0 || !isSearchResult ? (
          <View>
            {!isSearchResult ? sectionHeading('Types') : null}
            {types.length > 0
              ? types.map((option) =>
                  renderChoice(
                    option.name,
                    destinationFromCollectionOption(option),
                    isSearchResult ? 'Type' : undefined
                  )
                )
              : (
                <AppText
                  variant="label"
                  tone="tertiary"
                  style={styles.emptySection}>
                  No types available yet.
                </AppText>
              )}
          </View>
        ) : null}

        {themes.length > 0 || !isSearchResult ? (
          <View>
            {!isSearchResult ? sectionHeading('Themes') : null}
            {themes.length > 0
              ? themes.map((option) =>
                  renderChoice(
                    option.name,
                    destinationFromCollectionOption(option),
                    isSearchResult ? 'Theme' : undefined
                  )
                )
              : (
                <AppText
                  variant="label"
                  tone="tertiary"
                  style={styles.emptySection}>
                  No themes available yet.
                </AppText>
              )}
          </View>
        ) : null}
      </View>
    );
  }

  const hasSearchResults = categories.some((category) => {
    const includeOverall =
      'overall'.includes(search) ||
      category.name.toLowerCase().includes(search) ||
      `overall ${category.name.toLowerCase()}`.includes(search);

    return (
      includeOverall ||
      optionsFor(category.id, category.name, 'type').length > 0 ||
      optionsFor(category.id, category.name, 'theme').length > 0
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.screen,
          { backgroundColor: colors.background },
        ]}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            {currentCategory ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to categories"
                onPress={() => {
                  Keyboard.dismiss();
                  setCategoryId(null);
                }}
                style={styles.headerAction}>
                <Ionicons
                  name="chevron-back"
                  size={25}
                  color={colors.text}
                />
              </Pressable>
            ) : (
              <View style={styles.headerAction} />
            )}

            <AppText variant="sectionTitle">
              {currentCategory?.name ?? 'Choose a Top 3'}
            </AppText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close destination selector"
              onPress={onClose}
              style={styles.headerAction}>
              <Ionicons
                name="close"
                size={24}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.secondarySurface },
            ]}>
            <Ionicons
              name="search"
              size={20}
              color={colors.secondaryText}
            />
            <TextInput
              ref={searchRef}
              accessibilityLabel="Search all Top 3 destinations"
              value={query}
              onChangeText={setQuery}
              placeholder="Search all Top 3s"
              placeholderTextColor={colors.tertiaryText}
              autoCorrect={false}
              style={[
                styles.searchInput,
                { color: colors.text },
              ]}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.secondaryText}
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            {search ? (
              hasSearchResults ? (
                categories.map((category) =>
                  renderCategory(category, true)
                )
              ) : (
                <AppText
                  variant="body"
                  tone="secondary"
                  style={styles.emptySearch}>
                  No matching Top 3s.
                </AppText>
              )
            ) : currentCategory ? (
              renderCategory(currentCategory)
            ) : (
              categories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => {
                    Keyboard.dismiss();
                    setCategoryId(category.id);
                  }}
                  style={[
                    styles.categoryRow,
                    { borderBottomColor: colors.border },
                  ]}>
                  <AppText variant="body">
                    {category.name}
                  </AppText>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.secondaryText}
                  />
                </Pressable>
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  categoryRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionHeading: {
    marginTop: 22,
    marginBottom: 10,
  },
  optionRow: {
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  emptySection: {
    paddingVertical: 12,
  },
  emptySearch: {
    paddingTop: 28,
    textAlign: 'center',
  },
});
