import AppText from '@/components/app-text';
import SearchInput from '@/components/search-input';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import type {
  CollectionOption,
  CollectionOptionKind,
} from '@/types/collection-option';
import {
  destinationFromCollectionOption,
  NotificationDestination,
} from '@/types/notification-destination';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Reanimated from 'react-native-reanimated';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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


// Modal content consumes insets from its own SafeAreaProvider (native Modal
// is a separate view root). Match the shared floating header used by screens.
function DestinationPickerLayout({
  title,
  showBackButton,
  onBack,
  onClose,
  pageKey,
  children,
}: {
  title: string;
  showBackButton: boolean;
  onBack: () => void;
  onClose: () => void;
  pageKey: string;
  children: ReactNode;
}) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const onScrollOffset = useCallback((_offset: number) => {}, []);
  const onScrollState = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler, headerStyle, resetHeader } =
    useHomeStickyHeader(onScrollOffset, onScrollState);

  // The category and result screens have independent scroll starting points.
  // Reset shared header state whenever the drill-down changes.
  useEffect(() => {
    resetHeader();
  }, [pageKey]);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Reanimated.View
          pointerEvents="box-none"
          style={[
            styles.floatingHeader,
            { height: insets.top + SCREEN_HEADER_HEIGHT + 16 },
            headerStyle,
          ]}>
          <ScreenHeader
            overlay
            featheredBackdrop
            androidStatusBarGlass
            centerTitle={title}
            showBackButton={showBackButton}
            onBackPress={onBack}
            backAccessibilityLabel="Back to categories"
            rightIconName="close"
            onRightPress={onClose}
            rightAccessibilityLabel="Close destination selector"
          />
        </Reanimated.View>
        <Reanimated.ScrollView
          key={pageKey}
          style={styles.screen}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + SCREEN_HEADER_HEIGHT + 24 },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}>
          {children}
        </Reanimated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}>
      <SafeAreaProvider
        style={[styles.screen, { backgroundColor: colors.background }]}>
        <DestinationPickerLayout
          title={currentCategory?.name ?? 'Choose a Top 3'}
          showBackButton={Boolean(currentCategory)}
          onBack={() => {
            Keyboard.dismiss();
            setCategoryId(null);
          }}
          onClose={onClose}
          pageKey={`${visible ? 'open' : 'closed'}:${categoryId ?? 'all'}`}>
          <View style={styles.searchBox}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search all Top 3s"
              accessibilityLabel="Search all Top 3 destinations"
              autoCorrect={false}
              onClear={() => setQuery('')}
            />
          </View>

          <View style={styles.content}>
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
          </View>
        </DestinationPickerLayout>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 0,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  searchBox: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
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
