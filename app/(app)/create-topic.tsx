import { isVisibleTop3Genre } from '@/utils/visible-top3-topics';
import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SegmentedControl from '@/components/segmented-control';
import {
  TOP3_CATEGORIES,
  Top3Topic,
} from '@/constants/top3-categories';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useTop3 } from '@/context/top3-context';
import { CollectionOption } from '@/types/collection-option';
import {
  getCollectionOptionBrowseTitle,
  getCollectionOptionListTitle,
} from '@/utils/collection-option-list-title';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import Reanimated from 'react-native-reanimated';
import { getRecentPublishedThemeActivity } from '@/lib/supabase/collections';
import { getTrendingThemes } from '@/services/trending-service';
import type { TrendingThemeActivityPost } from '@/types/trending-theme-activity';
import { Top3List } from '@/types/top3-list';
import {
  buildCollectionTitle,
  buildEntityCollectionTitle,
} from '@/utils/build-collection-title';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
function normalizeValue(value?: string) {
  const normalizedValue = value?.trim().toLowerCase() ?? '';
  return normalizedValue === 'general' ? '' : normalizedValue;
}
function findExistingCollection(
  lists: Top3List[],
  categoryId: string,
  topicName?: string,
  typeName?: string,
  collectionOptionId?: string
) {
  const normalizedCategoryId = normalizeValue(categoryId);
  const normalizedTopic = normalizeValue(topicName);
  const normalizedType = normalizeValue(typeName);
  const normalizedCollectionOptionId =
    collectionOptionId?.trim().toLowerCase();
  const matchingCollections = lists.filter((list) => {
    const existingCollectionOptionId =
      list.collectionOptionId
        ?.trim()
        .toLowerCase();
    if (
      normalizedCollectionOptionId &&
      existingCollectionOptionId
    ) {
      return (
        existingCollectionOptionId ===
        normalizedCollectionOptionId
      );
    }
    return (
      normalizeValue(list.category) === normalizedCategoryId &&
      normalizeValue(list.topic) === normalizedTopic &&
      normalizeValue(list.type) === normalizedType
    );
  });
  if (matchingCollections.length === 0) {
    return undefined;
  }
  const publishedCollection = matchingCollections.find((list) =>
    Boolean(list.publishedAt)
  );
  if (publishedCollection) {
    return publishedCollection;
  }
  const populatedCollection = matchingCollections.find((list) =>
    list.items.some((item) => item !== null)
  );
  return populatedCollection ?? matchingCollections[0];
}
function getSortedTopics(topics: Top3Topic[], categoryId: string) {
  return topics
    .filter((topic) => isVisibleTop3Genre(topic, categoryId))
    .sort((first, second) => first.name.localeCompare(second.name));
}
const SCREEN_HORIZONTAL_PADDING = 20;
const GENRE_CONTAINER_HORIZONTAL_PADDING = 18;
const TOPIC_GAP = 12;
const MIN_THREE_COLUMN_CARD_WIDTH = 112;
const MIN_TRENDING_THEME_CREATORS = 3;
const MAX_TRENDING_THEMES = 5;

// The root layout draws a solid Android system-navigation backdrop.
// Keep these screens above that backdrop without altering iOS spacing.
const SCREEN_SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'android'
    ? ['top', 'left', 'right', 'bottom']
    : ['top', 'left', 'right'];

// Each Create Topic mode mounts its own animated scroll shell. This keeps
// the Home-tested gesture-linked header state independent when navigating
// between Overall, By type and By theme (without changing their content).
function CreateTopicScrollShell({
  children,
  backgroundColor,
  persistKeyboardTaps = false,
}: {
  children: ReactNode;
  backgroundColor: string;
  persistKeyboardTaps?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const ignoreTopicScroll = useCallback((_offset: number) => {}, []);
  const ignoreTopicScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler, headerStyle } =
    useHomeStickyHeader(ignoreTopicScroll, ignoreTopicScrolled);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={Platform.OS === 'android'
        ? ['left', 'right', 'bottom']
        : ['left', 'right']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + SCREEN_HEADER_HEIGHT + 16,
            zIndex: 30,
          },
          headerStyle,
        ]}>
        <ScreenHeader
          showBackButton
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>
      <Reanimated.ScrollView
        style={[styles.scrollView, { backgroundColor }]}
        contentContainerStyle={[
          styles.scrollContent,
          // Removing the top safe-area edge must not shift the title/cards.
          { paddingTop: SCREEN_HEADER_HEIGHT + insets.top },
        ]}
        keyboardShouldPersistTaps={persistKeyboardTaps ? 'handled' : undefined}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}>
        {children}
      </Reanimated.ScrollView>
    </SafeAreaView>
  );
}

export default function CreateTopicScreen() {
  const colors = useAppColors();
  const { width: windowWidth } = useWindowDimensions();
  const [
    themeSearchQuery,
    setThemeSearchQuery,
  ] = useState('');
  const [
    themeBrowseMode,
    setThemeBrowseMode,
  ] = useState<'featured' | 'all'>('featured');
  const [
    typeBrowseMode,
    setTypeBrowseMode,
  ] = useState<'genres' | 'types'>('genres');
  const [
    themeGroupFilter,
    setThemeGroupFilter,
  ] = useState<string | 'all'>('all');
  const themeGroupContentWidthRef =
    useRef(0);
  const themeGroupViewportWidthRef =
    useRef(0);
  const themeGroupHintOpacity =
    useRef(new Animated.Value(1)).current;
  const [
    canScrollThemeGroups,
    setCanScrollThemeGroups,
  ] = useState(false);
  const [
    themeGroupHintDirection,
    setThemeGroupHintDirection,
  ] = useState<'right' | 'left'>('right');
  const [
    publishedPosts,
    setPublishedPosts,
  ] = useState<TrendingThemeActivityPost[]>([]);
  function fadeThemeGroupHint(toValue: number) {
    Animated.timing(themeGroupHintOpacity, {
      toValue,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }
  function handleThemeGroupScrollEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const {
      contentOffset,
      layoutMeasurement,
      contentSize,
    } = event.nativeEvent;
    const atStart = contentOffset.x <= 8;
    const atEnd =
      contentOffset.x + layoutMeasurement.width >=
      contentSize.width - 8;
    if (atEnd) {
      setThemeGroupHintDirection('left');
      fadeThemeGroupHint(1);
      return;
    }
    if (atStart) {
      setThemeGroupHintDirection('right');
      fadeThemeGroupHint(1);
      return;
    }
    fadeThemeGroupHint(0);
  }
  const topicGridWidth =
    windowWidth -
    SCREEN_HORIZONTAL_PADDING * 2 -
    GENRE_CONTAINER_HORIZONTAL_PADDING * 2 -
    2;
  const threeColumnWidth = (topicGridWidth - TOPIC_GAP * 2) / 3;
  const topicColumnCount =
    threeColumnWidth >= MIN_THREE_COLUMN_CARD_WIDTH ? 3 : 2;
  const topicCardWidth =
    (topicGridWidth - TOPIC_GAP * (topicColumnCount - 1)) /
    topicColumnCount;
  const params = useLocalSearchParams<{
    categoryId?: string | string[];
    topicId?: string | string[];
    themeSlug?: string | string[];
    typeOptionId?: string | string[];
    mode?: string | string[];
    source?: string | string[];
    // CARD_RETURN_TO_ORIGIN_20261025
    fromFeedCard?: string | string[];
    requestUserId?: string | string[];
  }>();
  const requestUserId = Array.isArray(params.requestUserId)
    ? params.requestUserId[0]
    : params.requestUserId;
  const isRequestMode = Boolean(requestUserId);
  const categoryId = Array.isArray(params.categoryId)
    ? params.categoryId[0]
    : params.categoryId;
  const requestedTopicId = Array.isArray(params.topicId)
    ? params.topicId[0]
    : params.topicId;
  const requestedThemeSlug = Array.isArray(params.themeSlug)
    ? params.themeSlug[0]
    : params.themeSlug;
  const requestedTypeOptionId = Array.isArray(params.typeOptionId)
    ? params.typeOptionId[0]
    : params.typeOptionId;
  // A card launch must not leave this intermediate chooser in the Back stack.
  // Replace it with the collection so the prior route remains the same
  // mounted feed instance (including its card/scroll position).
  const isFromFeedCard =
    (Array.isArray(params.fromFeedCard)
      ? params.fromFeedCard[0]
      : params.fromFeedCard) === '1';

  const openCollectionFromSelection = (destination: Parameters<typeof router.push>[0]) => {
    if (isFromFeedCard) {
      router.replace(destination);
    } else {
      router.push(destination);
    }
  };

  const requestedMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;
  const mode =
    requestedMode === 'type' || requestedMode === 'theme'
      ? requestedMode
      : undefined;

  const isOnboardingCreate =
    (Array.isArray(params.source) ? params.source[0] : params.source) === 'onboarding';
  const { startListWithoutSaving, lists, selectList } = useTop3();
  const { startCollection: startOnboardingCollection } = useOnboardingCollection();
  const { getOptionsForCategory } =
    useCollectionOptions();
  const hasHandledRequestedTopic = useRef(false);
  const hasHandledRequestedTheme = useRef(false);
  const hasHandledRequestedType = useRef(false);
  const isCreatingRef = useRef(false);
  const [creatingCollectionKey, setCreatingCollectionKey] = useState<
    string | null
  >(null);
  const category = TOP3_CATEGORIES.find((item) => item.id === categoryId);
  // Allow the four Hooks to run before the missing-category fallback.
  // Effects below skip work when category is absent.
  const selectedCategory = category ?? TOP3_CATEGORIES[0];
  const topics = getSortedTopics(selectedCategory.topics, selectedCategory.id);
  const rawTypeOptions =
    getOptionsForCategory(
      selectedCategory.id,
      'type'
    );
  const typeOptions =
    selectedCategory.id === 'albums'
      ? [...rawTypeOptions].sort((first, second) =>
          first.name.localeCompare(second.name)
        )
      : rawTypeOptions;
  const themes =
    getOptionsForCategory(
      selectedCategory.id,
      'theme'
    );
  const hasGenreOptions = topics.length > 0;
  const hasTypeOptions =
    typeOptions.length > 0;
  const hasTypeChoices = hasGenreOptions || hasTypeOptions;
  const typeOptionsArePeople =
    hasTypeOptions &&
    (selectedCategory.id === 'artists' ||
      typeOptions.every(
        (option) =>
          option.groupName === 'people' ||
          option.entityKind === 'person'
      ));
  const typeOptionsLabel =
    typeOptionsArePeople
      ? 'People'
      : selectedCategory.id === 'albums'
        ? 'Formats'
        : selectedCategory.id === 'games'
          ? 'Play Styles'
          : 'Types';
  const hasThemeOptions =
    themes.length > 0;
  const typeScreenTitle = 'By type';
  const typeCardSubtitle =
    selectedCategory.id === 'games'
      ? 'Choose the kind of game to rank.'
      : 'Choose what or who to rank.';
  const themeCardSubtitle = 'Rank around an idea or experience.';
  const typeScreenSubtitle = typeCardSubtitle;
  const overallCollection = findExistingCollection(
    lists,
    selectedCategory.id,
    undefined
  );
  const overallIsPublished = Boolean(overallCollection?.publishedAt);
  useEffect(() => {
    if (
      !category ||
      mode !== 'theme' ||
      !hasThemeOptions
    ) {
      return;
    }
    let isMounted = true;
    async function loadThemeActivity() {
      try {
        const posts =
          await getRecentPublishedThemeActivity();
        if (isMounted) {
          setPublishedPosts(posts);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load theme activity:',
            error
          );
        }
        if (isMounted) {
          setPublishedPosts([]);
        }
      }
    }
    void loadThemeActivity();
    return () => {
      isMounted = false;
    };
  }, [mode, selectedCategory.id, category, hasThemeOptions]);
  // DEFER_LIST_CREATION_UNTIL_FIRST_ITEM_20261025: navigate without an INSERT.
  async function chooseCollection(
    topic?: Pick<Top3Topic, 'id' | 'name'>,
    titleOverride?: string,
    collectionOption?: CollectionOption
  ) {
    if (isCreatingRef.current) {
      return;
    }
    const topicName =
      collectionOption?.name ??
      topic?.name;
    const title =
      titleOverride ?? buildCollectionTitle(selectedCategory.id, topic?.id);
    if (requestUserId) {
      router.push({
        pathname: '/request-top3',
        params: {
          userId: requestUserId,
          categoryId: selectedCategory.id,
          kind: collectionOption
            ? 'theme'
            : topic?.id && topic.id !== 'general'
              ? 'genre'
              : 'overall',
          ...(collectionOption
            ? { optionId: collectionOption.id }
            : topic?.id && topic.id !== 'general'
              ? { optionId: topic.id }
              : {}),
        },
      } as never);
      return;
    }
    if (isOnboardingCreate) {
      startOnboardingCollection({
        category: selectedCategory.id,
        topic: topicName,
        themeId: mode === 'theme'
          ? collectionOption?.slug ?? topic?.id
          : undefined,
        collectionOptionId: collectionOption?.id,
        title,
      });
      router.push('/onboarding-collection');
      return;
    }
    const existingCollection = findExistingCollection(
      lists,
      selectedCategory.id,
      topicName,
      undefined,
      collectionOption?.id
    );
    if (existingCollection) {
      selectList(existingCollection.id);
      openCollectionFromSelection({
        pathname: '/collection',
        params: { listId: existingCollection.id },
      });
      return;
    }
    const collectionKey =
      collectionOption?.id ??
      topic?.id ??
      'general';
    isCreatingRef.current = true;
    setCreatingCollectionKey(collectionKey);
    try {
      const listId = startListWithoutSaving({
        category: selectedCategory.id,
        topic: topicName,
        themeId:
          mode === 'theme'
            ? collectionOption?.slug ??
              topic?.id
            : undefined,
        collectionOptionId:
          collectionOption?.id,
        title,
      });
      openCollectionFromSelection({
        pathname: '/collection',
        params: { listId },
      });
    } catch (error) {
      if (__DEV__) {
        console.log('Failed to create collection:', error);
      }
      Alert.alert(
        'Couldn’t create this Top 3',
        'Check your connection and try again.'
      );
    } finally {
      isCreatingRef.current = false;
      setCreatingCollectionKey(null);
    }
  }
  function openMode(nextMode: 'type' | 'theme') {
    router.push(
      {
        pathname: isOnboardingCreate ? '/onboarding-create-topic' : '/create-topic',
        params: {
          categoryId: selectedCategory.id,
          mode: nextMode,
          ...(isOnboardingCreate ? { source: 'onboarding' } : {}),
          ...(requestUserId ? { requestUserId } : {}),
        },
      } as never
    );
  }
  async function chooseEntityType(
    option: CollectionOption
  ) {
    if (isCreatingRef.current) {
      return;
    }
    if (requestUserId) {
      router.push({
        pathname: '/request-top3',
        params: {
          userId: requestUserId,
          categoryId: selectedCategory.id,
          kind: 'type',
          optionId: option.id,
        },
      } as never);
      return;
    }
    if (isOnboardingCreate) {
      startOnboardingCollection({
        category: selectedCategory.id,
        type: option.name,
        collectionOptionId: option.id,
        title: buildEntityCollectionTitle(option.name),
      });
      router.push('/onboarding-collection');
      return;
    }
    // Prefer the new Type identity, but recognize existing
    // Soundtrack genre lists until production migration.
    const existingCollection =
      findExistingCollection(
        lists,
        selectedCategory.id,
        undefined,
        option.name,
        option.id
      ) ??
      (selectedCategory.id === 'albums' &&
      option.slug === 'soundtracks'
        ? findExistingCollection(
            lists,
            'albums',
            'Soundtrack'
          )
        : undefined);
    if (existingCollection) {
      selectList(existingCollection.id);
      openCollectionFromSelection({
        pathname: '/collection',
        params: { listId: existingCollection.id },
      });
      return;
    }
    isCreatingRef.current = true;
    setCreatingCollectionKey(option.id);
    try {
      const listId = startListWithoutSaving({
        category: selectedCategory.id,
        type: option.name,
        collectionOptionId: option.id,
        title: buildEntityCollectionTitle(option.name),
      });
      openCollectionFromSelection({
        pathname: '/collection',
        params: { listId },
      });
    } catch (error) {
      if (__DEV__) {
        console.log(
          `Failed to create ${option.name} collection:`,
          error
        );
      }
      Alert.alert(
        `Couldn’t create Top 3 ${option.name}`,
        'Check your connection and try again.'
      );
    } finally {
      isCreatingRef.current = false;
      setCreatingCollectionKey(null);
    }
  }
  // CREATE_YOURS_FEED_ACTION_20261025: open the matching Type from a card.
  // The existing Type handler resumes an owned list or creates empty ranks.
  useEffect(() => {
    if (
      !category ||
      !requestedTypeOptionId ||
      mode !== 'type' ||
      hasHandledRequestedType.current
    ) {
      return;
    }
    const requestedKey = requestedTypeOptionId.trim().toLowerCase();
    const requestedType = typeOptions.find((option) =>
      [option.id, option.slug, option.name].some(
        (value) => value?.trim().toLowerCase() === requestedKey
      )
    );
    if (!requestedType) {
      // Options may still be loading; keep the selection screen available.
      return;
    }
    hasHandledRequestedType.current = true;
    void chooseEntityType(requestedType);
  }, [requestedTypeOptionId, mode, typeOptions, category]);

  function chooseRequestedTopic() {
    if (!requestedTopicId) {
      return;
    }
    if (requestedTopicId === 'general') {
      chooseCollection();
      return;
    }
    const requestedTopic = topics.find(
      (topic) => topic.id === requestedTopicId
    );
    if (requestedTopic) {
      chooseCollection(requestedTopic);
    }
  }
  useEffect(() => {
    if (!category || !requestedTopicId || hasHandledRequestedTopic.current) {
      return;
    }
    hasHandledRequestedTopic.current = true;
    chooseRequestedTopic();
  }, [requestedTopicId, category]);
  useEffect(() => {
    if (
      !category ||
      !requestedThemeSlug ||
      mode !== 'theme' ||
      hasHandledRequestedTheme.current
    ) {
      return;
    }
    const requestedTheme = themes.find(
      (theme) =>
        theme.slug === requestedThemeSlug ||
        theme.id === requestedThemeSlug
    );
    if (!requestedTheme) {
      return;
    }
    hasHandledRequestedTheme.current = true;
    void chooseCollection(
      undefined,
      getCollectionOptionListTitle(requestedTheme),
      requestedTheme
    );
  }, [requestedThemeSlug, mode, themes, category]);
  if (!category) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={SCREEN_SAFE_AREA_EDGES}>
        <ScreenHeader showBackButton />
        <PageHeader
          title="Choose a category"
          subtitle="Select a category before choosing a topic."
        />
        <View style={styles.emptyState}>
          <Pressable
            style={({ pressed }) => [
              styles.returnButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Return to categories">
            <AppText
              variant="action"
              tone="onPrimary"
              emphasis="strong">
              Choose a category
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  if (!mode) {
    return (
      <CreateTopicScrollShell
        key={`${selectedCategory.id}:choice`}
        backgroundColor={colors.background}>
        <PageHeader
          title={`${selectedCategory.icon} ${selectedCategory.name}`}
          subtitle={isRequestMode ? 'How would you like them to rank?' : 'How would you like to rank them?'}
        />
        <View style={styles.content}>
          <Pressable
            style={({ pressed }) => [
              styles.choiceCard,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
            onPress={() => chooseCollection()}
            disabled={creatingCollectionKey !== null}
            accessibilityRole="button"
            accessibilityLabel={
              overallIsPublished
                ? `${isRequestMode ? 'Request' : 'Edit'} overall ${selectedCategory.name}`
                : `${isRequestMode ? 'Request' : 'Rank'} overall ${selectedCategory.name}`
            }>
            <View style={styles.choiceText}>
              <AppText variant="selectionTitle">Overall</AppText>
              <AppText variant="subtitle" style={styles.choiceSubtitle}>
                {isRequestMode ? 'Their' : 'Your'} three favourite {selectedCategory.name.toLowerCase()}.
              </AppText>
            </View>
            {creatingCollectionKey === 'general' ? (
              <ActivityIndicator
                size="small"
                color={colors.secondaryText}
              />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tertiaryText}
              />
            )}
          </Pressable>
          {hasTypeChoices ? (
            <Pressable
              style={({ pressed }) => [
                styles.choiceCard,
                styles.choiceCardSpacing,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
              onPress={() => openMode('type')}
              accessibilityRole="button"
              accessibilityLabel={`${isRequestMode ? 'Request' : 'Create'} a ${selectedCategory.name} Top 3 ${typeScreenTitle.toLowerCase()}`} >
              <View style={styles.choiceText}>
                <AppText variant="selectionTitle">{typeScreenTitle}</AppText>
                <AppText variant="subtitle" style={styles.choiceSubtitle}>
                  {typeCardSubtitle}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tertiaryText}
              />
            </Pressable>
          ) : null}
          {hasThemeOptions ? (
            <Pressable
              style={({ pressed }) => [
                styles.choiceCard,
                styles.choiceCardSpacing,
                { backgroundColor: colors.surface },
                pressed && styles.pressed,
              ]}
              onPress={() => openMode('theme')}
              accessibilityRole="button"
              accessibilityLabel={`${isRequestMode ? 'Request' : 'Create'} a ${selectedCategory.name} Top 3 by theme`} >
              <View style={styles.choiceText}>
                <AppText variant="selectionTitle">By theme</AppText>
                <AppText variant="subtitle" style={styles.choiceSubtitle}>
                  {themeCardSubtitle}
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tertiaryText}
              />
            </Pressable>
          ) : null}
        </View>
      </CreateTopicScrollShell>
    );
  }
  if (hasTypeChoices && mode === 'type') {
    return (
      <CreateTopicScrollShell
        key={`${selectedCategory.id}:type`}
        backgroundColor={colors.background}>
        <PageHeader
          title={typeScreenTitle}
          subtitle={typeScreenSubtitle}
        />
        <View style={styles.content}>
          {hasGenreOptions && hasTypeOptions ? (
            <View style={styles.typeSegmentedSection}>
              <SegmentedControl<'genres' | 'types'>
                value={typeBrowseMode}
                options={[
                  {
                    value: 'genres',
                    label: 'Genres',
                    accessibilityLabel: 'Show genres',
                  },
                  {
                    value: 'types',
                    label: typeOptionsLabel,
                    accessibilityLabel: `Show ${typeOptionsLabel.toLowerCase()}`,
                  },
                ]}
                onChange={(value) => {
                  setTypeBrowseMode(value);
                }}
              />
            </View>
          ) : null}
          <View style={styles.typeList}>
            {hasGenreOptions && (!hasTypeOptions || typeBrowseMode === 'genres')
              ? topics.map((topic) => {
                  const existingCollection =
                    findExistingCollection(
                      lists,
                      selectedCategory.id,
                      topic.name
                    );
                  const isPublished = Boolean(
                    existingCollection?.publishedAt
                  );
                  return (
                    <Pressable
                      key={topic.id}
                      style={({ pressed }) => [
                        styles.themeRow,
                        {
                          backgroundColor: colors.surface,
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => chooseCollection(topic)}
                      disabled={creatingCollectionKey !== null}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPublished
                          ? `Edit ${topic.name} ${selectedCategory.name}`
                          : `${topic.name} ${selectedCategory.name}`
                      }>
                      <View style={styles.themeRowText}>
                        <AppText
                          variant="selectionTitle"
                          style={styles.themeRowTitle}>
                          {topic.name}
                        </AppText>
                      </View>
                      {creatingCollectionKey === topic.id ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.secondaryText}
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={22}
                          color={colors.tertiaryText}
                        />
                      )}
                    </Pressable>
                  );
                })
              : typeOptions.map((entityType) => (
                  <Pressable
                    key={entityType.id}
                    style={({ pressed }) => [
                      styles.themeRow,
                      {
                        backgroundColor: colors.surface,
                      },
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      chooseEntityType(entityType)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Top 3 ${entityType.name}`}>
                    <View style={styles.themeRowText}>
                      <AppText
                        variant="selectionTitle"
                        style={styles.themeRowTitle}>
                        {entityType.name}
                      </AppText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={colors.tertiaryText}
                    />
                  </Pressable>
                ))}
          </View>
        </View>
      </CreateTopicScrollShell>
    );
  }
  if (hasThemeOptions && mode === 'theme') {

    const trendingThemeActivity =
      getTrendingThemes(
        publishedPosts,
        themes
      )
        .filter(
          (theme) =>
            theme.categoryId ===
              selectedCategory.id &&
            theme.uniqueCreatorCount >=
              MIN_TRENDING_THEME_CREATORS
        )
        .slice(
          0,
          MAX_TRENDING_THEMES
        );
    const trendingThemes =
      trendingThemeActivity.flatMap(
        (activity) => {
          const theme = themes.find(
            (candidate) =>
              candidate.slug ===
              activity.themeId
          );
          return theme ? [theme] : [];
        }
      );
    // A single Theme can qualify when enough distinct
    // creators have published Lists for it.
    const showTrendingThemes =
      trendingThemes.length > 0;

    // Proportional Featured capacity:
    // Albums (9 Themes): 5
    // Smaller categories (5 Themes): 3
    // Larger categories: up to 8
    const maxFeaturedThemes = Math.min(
      themes.length,
      8,
      Math.max(3, Math.ceil(themes.length / 2))
    );

    const editorialThemes = themes.filter(
      (theme) => theme.featured
    );

    // Keep two editorial choices when possible.
    const editorialPins = editorialThemes.slice(
      0,
      Math.min(2, maxFeaturedThemes)
    );

    // Fill the remaining spaces with eligible Trending
    // Themes once the existing activity threshold is met.
    const trendingPicks = showTrendingThemes
      ? trendingThemes
          .filter(
            (theme) =>
              theme.trendingEnabled &&
              !editorialPins.some(
                (pin) => pin.id === theme.id
              )
          )
          .slice(
            0,
            maxFeaturedThemes - editorialPins.length
          )
      : [];

    // Editorial selections fill unused spaces.
    // The full active Theme catalogue is the final
    // fallback, preventing an empty Featured screen.
    const primaryThemes = [
      ...editorialPins,
      ...trendingPicks,
      ...editorialThemes,
      ...themes,
    ]
      .filter(
        (theme, index, all) =>
          all.findIndex(
            (candidate) => candidate.id === theme.id
          ) === index
      )
      .slice(0, maxFeaturedThemes);

    const primaryThemeLabel = 'Featured';
    const normalizedThemeQuery =
      themeSearchQuery.trim().toLowerCase();
    const themeGroupOptions =
      Array.from(
        new Set(
          themes
            .map(
              (theme) => theme.groupName
            )
            .filter(
              (group): group is string =>
                Boolean(group)
            )
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      );
    const matchingThemes =
      themes.filter((theme) => {
        if (
          !normalizedThemeQuery &&
          themeBrowseMode === 'all' &&
          themeGroupFilter !== 'all' &&
          theme.groupName !== themeGroupFilter
        ) {
          return false;
        }
        if (!normalizedThemeQuery) {
          return true;
        }
        const matchesName =
          theme.name
            .toLowerCase()
            .includes(normalizedThemeQuery);
        const matchesKeyword =
          theme.keywords.some((keyword) =>
            keyword
              .toLowerCase()
              .includes(normalizedThemeQuery)
          );
        return matchesName || matchesKeyword;
      });
    const visibleThemes =
      normalizedThemeQuery
        ? matchingThemes
        : themeBrowseMode === 'featured'
          ? primaryThemes
          : [...matchingThemes].sort(
              (first, second) =>
                first.name.localeCompare(
                  second.name
                )
            );
    const showThemeListHeading =
      Boolean(normalizedThemeQuery);
    const themeSectionTitle =
      normalizedThemeQuery
        ? 'Search results'
        : '';
    function renderThemeRow(
      theme: CollectionOption
    ) {
      const existingCollection =
        findExistingCollection(
          lists,
          selectedCategory.id,
          theme.name
        );
      const isPublished =
        Boolean(
          existingCollection?.publishedAt
        );
      const isCreating =
        creatingCollectionKey ===
        theme.id;
      return (
        <Pressable
          key={theme.id}
          style={({ pressed }) => [
            styles.themeRow,
            {
              backgroundColor:
                colors.surface,
            },
            pressed &&
              styles.pressed,
          ]}
          onPress={() =>
            chooseCollection(
              undefined,
              getCollectionOptionListTitle(theme),
              theme
            )
          }
          disabled={
            creatingCollectionKey !== null
          }
          accessibilityRole="button"
          accessibilityLabel={
            isPublished
              ? `Edit ${getCollectionOptionListTitle(theme)}`
              : `Create ${getCollectionOptionListTitle(theme)}`
          }>
          <View style={styles.themeRowText}>
            <AppText
              variant="selectionTitle"
              style={styles.themeRowTitle}>
              {getCollectionOptionBrowseTitle(theme)}
            </AppText>
            {theme.browseLabel ? (
              <AppText
                variant="subtitle"
                tone="tertiary"
                style={styles.themeRowDescription}
                numberOfLines={2}>
                {theme.browseLabel}
              </AppText>
            ) : null}
          </View>
          {isCreating ? (
            <ActivityIndicator
              size="small"
              color={colors.secondaryText}
            />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.tertiaryText}
            />
          )}
        </Pressable>
      );
    }
    return (
      <CreateTopicScrollShell
        key={`${selectedCategory.id}:theme`}
        backgroundColor={colors.background}
        persistKeyboardTaps>
        <PageHeader
          title="By theme"
          subtitle={themeCardSubtitle}
        />
        <View style={styles.content}>
          <SearchInput
            borderless
            value={themeSearchQuery}
            onChangeText={(value) => {
              setThemeSearchQuery(value);
              if (value.trim()) {
                setThemeGroupFilter('all');
              }
            }}
            placeholder="Search themes..."
            accessibilityLabel="Search themes"
          />
          {!normalizedThemeQuery ? (
            <View
              style={
                styles.themeSegmentedSection
              }>
              <SegmentedControl<
                'featured' | 'all'
              >
                value={themeBrowseMode}
                options={[
                  {
                    value: 'featured',
                    label:
                      primaryThemeLabel,
                    accessibilityLabel: 'Show featured themes',
                  },
                  {
                    value: 'all',
                    label: 'Browse',
                    accessibilityLabel:
                      'Browse all themes',
                  },
                ]}
                onChange={(value) => {
                  setThemeBrowseMode(value);
                  if (value === 'featured') {
                    setThemeGroupFilter('all');
                  }
                }}
              />
            </View>
          ) : null}
          <View style={styles.themeListSection}>
            {showThemeListHeading ? (
              <AppText
                variant="sectionTitle"
                style={
                  styles.themeListHeading
                }>
                {themeSectionTitle}
              </AppText>
            ) : null}
            {themeBrowseMode === 'all' &&
            !normalizedThemeQuery ? (
              <View style={styles.themeGroupFilterRow}>
                <ScrollView
                  style={styles.themeGroupFilterScroll}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onLayout={(event) => {
                    const width =
                      event.nativeEvent.layout.width;
                    themeGroupViewportWidthRef.current =
                      width;
                    const canScroll =
                      themeGroupContentWidthRef.current >
                      width + 4;
                    setCanScrollThemeGroups(canScroll);
                    if (canScroll) {
                      setThemeGroupHintDirection('right');
                      themeGroupHintOpacity.setValue(1);
                    } else {
                      themeGroupHintOpacity.setValue(0);
                    }
                  }}
                  onContentSizeChange={(width) => {
                    themeGroupContentWidthRef.current =
                      width;
                    const canScroll =
                      width >
                      themeGroupViewportWidthRef.current + 4;
                    setCanScrollThemeGroups(canScroll);
                    if (canScroll) {
                      setThemeGroupHintDirection('right');
                      themeGroupHintOpacity.setValue(1);
                    } else {
                      themeGroupHintOpacity.setValue(0);
                    }
                  }}
                  onScrollBeginDrag={() => {
                    fadeThemeGroupHint(0);
                  }}
                  onScrollEndDrag={handleThemeGroupScrollEnd}
                  onMomentumScrollEnd={handleThemeGroupScrollEnd}
                  scrollEventThrottle={16}
                  contentContainerStyle={
                    styles.themeGroupFilterContent
                  }>
                  {[
                    'all' as const,
                    ...themeGroupOptions,
                  ].map((group) => {
                    const selected =
                      themeGroupFilter === group;
                    const label =
                      group === 'all'
                        ? 'All'
                        : group.charAt(0).toUpperCase() +
                          group.slice(1);
                    return (
                      <Pressable
                        key={group}
                        style={({ pressed }) => [
                          styles.themeGroupFilterChip,
                          {
                            backgroundColor: selected
                              ? colors.primary
                              : colors.secondarySurface,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() =>
                          setThemeGroupFilter(group)
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Filter themes by ${label}`}>
                        <AppText
                          variant="body"
                          tone={
                            selected
                              ? 'onPrimary'
                              : 'primary'
                          }>
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {canScrollThemeGroups ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.themeGroupScrollHint,
                      {
                        opacity: themeGroupHintOpacity,
                        backgroundColor: colors.background,
                      },
                    ]}>
                    <Ionicons
                      name={
                        themeGroupHintDirection === 'right'
                          ? 'arrow-forward'
                          : 'arrow-back'
                      }
                      size={18}
                      color={colors.tertiaryText}
                    />
                  </Animated.View>
                ) : null}
              </View>
            ) : null}
            {visibleThemes.length > 0 ? (
              <View style={styles.themeList}>
                {visibleThemes.map(
                  renderThemeRow
                )}
              </View>
            ) : (
              <View
                style={
                  styles.themeEmptyState
                }>
                <AppText
                  variant="selectionTitle">
                  No themes found
                </AppText>
                <AppText
                  variant="subtitle"
                  tone="tertiary"
                  style={
                    styles.themeEmptyText
                  }>
                  Try another keyword.
                </AppText>
              </View>
            )}
          </View>
        </View>
      </CreateTopicScrollShell>
    );
  }
  return (
      <CreateTopicScrollShell
        key={`${selectedCategory.id}:fallback`}
        backgroundColor={colors.background}>
      <PageHeader
        title={`${selectedCategory.icon} ${selectedCategory.name}`}
        subtitle={isRequestMode ? 'Ask them for an overall Top 3 or a genre.' : 'Rank them all, or choose a genre.'}
      />
      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [
            styles.overallCard,
            { backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
          onPress={() => chooseCollection()}
          disabled={creatingCollectionKey !== null}
          accessibilityRole="button"
          accessibilityLabel={
            overallIsPublished
              ? `${isRequestMode ? 'Request' : 'Edit'} overall ${selectedCategory.name}`
              : `${isRequestMode ? 'Request' : 'Rank'} overall ${selectedCategory.name}`
          }>
          <View style={styles.overallText}>
            <AppText variant="selectionTitle">
              All {selectedCategory.name}
            </AppText>
            <AppText variant="subtitle" style={styles.overallSubtitle}>
              {isRequestMode ? 'Ask for their favourites across every genre.' : 'Rank your favourites across every genre.'}
            </AppText>
          </View>
          {creatingCollectionKey === 'general' ? (
            <ActivityIndicator size="small" color={colors.secondaryText} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tertiaryText}
            />
          )}
        </Pressable>
        {topics.length > 0 ? (
          <View
            style={[
              styles.genreContainer,
              styles.legacyGenreContainer,
              { backgroundColor: colors.surface },
            ]}>
            <View style={styles.genreHeadingRow}>
              <AppText variant="selectionTitle">Choose a Genre</AppText>
              <AppText
                variant="selectionTitle"
                tone="tertiary"
                emphasis="regular">
                {' '}(optional)
              </AppText>
            </View>
            <View style={styles.topicGrid}>
              {topics.map((topic) => {
                const existingCollection = findExistingCollection(
                  lists,
                  selectedCategory.id,
                  topic.name
                );
                const isPublished = Boolean(existingCollection?.publishedAt);
                return (
                  <View
                    key={topic.id}
                    style={[styles.topicCardWrapper, { width: topicCardWidth }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.topicCard,
                        { backgroundColor: colors.secondarySurface },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => chooseCollection(topic)}
                      disabled={creatingCollectionKey !== null}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPublished
                          ? `Edit ${topic.name} ${selectedCategory.name}`
                          : `${topic.name} ${selectedCategory.name}`
                      }>
                      <AppText
                        variant="label"
                        tone="primary"
                        style={styles.topicName}>
                        {topic.name}
                      </AppText>
                      {creatingCollectionKey === topic.id ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.secondaryText}
                        />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </CreateTopicScrollShell>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SCREEN_HEADER_HEIGHT,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  choiceCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
  },
  choiceCardSpacing: {
    marginTop: 12,
  },
  choiceText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  choiceSubtitle: {
    marginTop: 4,
  },
  themeSegmentedSection: {
    marginTop: 16,
  },
  typeSegmentedSection: {
    marginTop: 4,
  },
  typeList: {
    marginTop: 16,
    gap: 12,
  },
  themeListSection: {
    marginTop: 28,
  },
  themeListHeading: {
    marginBottom: 14,
  },
  themeList: {
    gap: 12,
  },
  themeRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
  },
  themeRowText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  themeRowTitle: {
  },
  themeRowDescription: {
    marginTop: 4,
  },
  themeGroupFilterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  themeGroupFilterScroll: {
    flex: 1,
    minWidth: 0,
  },
  themeGroupFilterContent: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingBottom: 16,
    paddingRight: 8,
    gap: 8,
  },
  themeGroupScrollHint: {
    width: 30,
    height: 40,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeGroupFilterChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  themeEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  themeEmptyText: {
    marginTop: 6,
    textAlign: 'center',
  },
  genreContainer: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 16,
  },
  legacyGenreContainer: {
    marginTop: 12,
  },
  genreHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionHeading: {
    marginBottom: 14,
  },
  genreSectionHeading: {
    marginTop: 22,
    marginBottom: 14,
  },
  overallCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
  },
  overallText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  overallSubtitle: {
    marginTop: 4,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
  },
  topicCardWrapper: {},
  topicCard: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  themeCard: {
    minHeight: 76,
  },
  topicName: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  returnButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
