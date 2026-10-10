import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SegmentedControl from '@/components/segmented-control';
import {
  TOP3_CATEGORIES,
  Top3Topic,
} from '@/constants/top3-categories';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useTop3 } from '@/context/top3-context';
import { CollectionOption } from '@/types/collection-option';
import { useAppColors } from '@/hooks/use-app-colors';
import { getPublishedPosts } from '@/services/post-service';
import {
  getTrendingThemes,
  getTrendingWindowPosts,
} from '@/services/trending-service';
import { Post } from '@/types/post';
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
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
function getSortedTopics(topics: Top3Topic[]) {
  return topics
    .filter((topic) => topic.id !== 'general')
    .sort((first, second) => first.name.localeCompare(second.name));
}
const SCREEN_HORIZONTAL_PADDING = 20;
const GENRE_CONTAINER_HORIZONTAL_PADDING = 18;
const TOPIC_GAP = 12;
const MIN_THREE_COLUMN_CARD_WIDTH = 112;
const MIN_TRENDING_THEME_CREATORS = 3;
const MIN_TRENDING_THEMES = 3;
const MAX_TRENDING_THEMES = 5;
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
  ] = useState<Post[]>([]);
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
    mode?: string | string[];
  }>();
  const categoryId = Array.isArray(params.categoryId)
    ? params.categoryId[0]
    : params.categoryId;
  const requestedTopicId = Array.isArray(params.topicId)
    ? params.topicId[0]
    : params.topicId;
  const requestedMode = Array.isArray(params.mode)
    ? params.mode[0]
    : params.mode;
  const mode =
    requestedMode === 'type' || requestedMode === 'theme'
      ? requestedMode
      : undefined;
  const { createList, lists, selectList } = useTop3();
  const { getOptionsForCategory } =
    useCollectionOptions();
  const hasHandledRequestedTopic = useRef(false);
  const isCreatingRef = useRef(false);
  const [creatingCollectionKey, setCreatingCollectionKey] = useState<
    string | null
  >(null);
  const category = TOP3_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}>
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
  const selectedCategory = category;
  const topics = getSortedTopics(selectedCategory.topics);
  const typeOptions =
    getOptionsForCategory(
      selectedCategory.id,
      'type'
    );
  const themes =
    getOptionsForCategory(
      selectedCategory.id,
      'theme'
    );
  const hasTypeOptions =
    typeOptions.length > 0;
  const typeOptionsArePeople =
    hasTypeOptions &&
    typeOptions.every(
      (option) =>
        option.groupName === 'people' ||
        option.entityKind === 'person'
    );
  const typeOptionsLabel =
    typeOptionsArePeople
      ? 'People'
      : 'Types';
  const hasThemeOptions =
    themes.length > 0;
  const hasConfigurableOptions =
    hasTypeOptions ||
    hasThemeOptions;
  const overallCollection = findExistingCollection(
    lists,
    selectedCategory.id,
    undefined
  );
  const overallIsPublished = Boolean(overallCollection?.publishedAt);
  useEffect(() => {
    if (
      mode !== 'theme' ||
      !hasThemeOptions
    ) {
      return;
    }
    let isMounted = true;
    async function loadThemeActivity() {
      try {
        const posts =
          await getPublishedPosts({
            hydrateMissingArtwork: false,
          });
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
  }, [mode, selectedCategory.id]);
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
    const existingCollection = findExistingCollection(
      lists,
      selectedCategory.id,
      topicName,
      undefined,
      collectionOption?.id
    );
    if (existingCollection) {
      selectList(existingCollection.id);
      router.push({
        pathname: '/collection',
        params: { listId: existingCollection.id },
      });
      return;
    }
    const title =
      titleOverride ?? buildCollectionTitle(selectedCategory.id, topic?.id);
    const collectionKey =
      collectionOption?.id ??
      topic?.id ??
      'general';
    isCreatingRef.current = true;
    setCreatingCollectionKey(collectionKey);
    try {
      const listId = await createList({
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
      router.push({
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
        pathname: '/create-topic',
        params: {
          categoryId: selectedCategory.id,
          mode: nextMode,
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
    const existingCollection = findExistingCollection(
      lists,
      selectedCategory.id,
      undefined,
      option.name,
      option.id
    );
    if (existingCollection) {
      selectList(existingCollection.id);
      router.push({
        pathname: '/collection',
        params: { listId: existingCollection.id },
      });
      return;
    }
    isCreatingRef.current = true;
    setCreatingCollectionKey(option.id);
    try {
      const listId = await createList({
        category: selectedCategory.id,
        type: option.name,
        collectionOptionId: option.id,
        title: buildEntityCollectionTitle(option.name),
      });
      router.push({
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
    if (!requestedTopicId || hasHandledRequestedTopic.current) {
      return;
    }
    hasHandledRequestedTopic.current = true;
    chooseRequestedTopic();
  }, [requestedTopicId]);
  if (hasConfigurableOptions && !mode) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />
        <PageHeader
          title={`${selectedCategory.icon} ${selectedCategory.name}`}
          subtitle="How would you like to rank them?"
        />
        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
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
                ? `Edit overall ${selectedCategory.name}`
                : `Rank overall ${selectedCategory.name}`
            }>
            <View style={styles.choiceText}>
              <AppText variant="selectionTitle">Overall</AppText>
              <AppText variant="subtitle" style={styles.choiceSubtitle}>
                Your three favourite {selectedCategory.name.toLowerCase()}.
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
          <Pressable
            style={({ pressed }) => [
              styles.choiceCard,
              styles.choiceCardSpacing,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
            onPress={() => openMode('type')}
            accessibilityRole="button"
            accessibilityLabel={`Create a ${selectedCategory.name} Top 3 by type`}>
            <View style={styles.choiceText}>
              <AppText variant="selectionTitle">By type</AppText>
              <AppText variant="subtitle" style={styles.choiceSubtitle}>
                Genres, {typeOptionsLabel.toLowerCase()} and more.
              </AppText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tertiaryText}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.choiceCard,
              styles.choiceCardSpacing,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
            onPress={() => openMode('theme')}
            accessibilityRole="button"
            accessibilityLabel={`Create a ${selectedCategory.name} Top 3 by theme`}>
            <View style={styles.choiceText}>
              <AppText variant="selectionTitle">By theme</AppText>
              <AppText variant="subtitle" style={styles.choiceSubtitle}>
                Moods, people, eras, platforms and more.
              </AppText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.tertiaryText}
            />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (
    hasConfigurableOptions &&
    mode === 'type'
  ) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />
        <PageHeader
          title="By type"
          subtitle={`Choose a genre or ${typeOptionsLabel.toLowerCase().replace(/s$/, '')}.`}
        />
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: colors.background },
          ]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
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
          <View style={styles.typeList}>
            {typeBrowseMode === 'genres'
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
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (
    hasConfigurableOptions &&
    hasThemeOptions &&
    mode === 'theme'
  ) {
    const recentThemePosts =
      getTrendingWindowPosts(
        publishedPosts,
        {
          fallbackToAll: false,
        }
      );
    const trendingThemeActivity =
      getTrendingThemes(
        recentThemePosts
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
    const showTrendingThemes =
      trendingThemes.length >=
      MIN_TRENDING_THEMES;
    const primaryThemes =
      showTrendingThemes
        ? trendingThemes
        : themes.filter(
            (theme) =>
              theme.featured
          );
    const primaryThemeLabel =
      showTrendingThemes
        ? 'Trending'
        : 'Featured';
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
              `Top 3 ${theme.name}`,
              theme
            )
          }
          disabled={
            creatingCollectionKey !== null
          }
          accessibilityRole="button"
          accessibilityLabel={
            isPublished
              ? `Edit Top 3 ${theme.name}`
              : `Create Top 3 ${theme.name}`
          }>
          <View style={styles.themeRowText}>
            <AppText
              variant="selectionTitle"
              style={styles.themeRowTitle}>
              {theme.name}
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
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />
        <PageHeader
          title="By theme"
          subtitle={`Choose a theme for your ${selectedCategory.name} Top 3.`}
        />
        <ScrollView
          style={[
            styles.scrollView,
            {
              backgroundColor:
                colors.background,
            },
          ]}
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
                    accessibilityLabel:
                      showTrendingThemes
                        ? 'Show trending themes'
                        : 'Show featured themes',
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
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />
      <PageHeader
        title={`${selectedCategory.icon} ${selectedCategory.name}`}
        subtitle="Rank them all, or choose a genre."
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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
              ? `Edit overall ${selectedCategory.name}`
              : `Rank overall ${selectedCategory.name}`
          }>
          <View style={styles.overallText}>
            <AppText variant="selectionTitle">
              All {selectedCategory.name}
            </AppText>
            <AppText variant="subtitle" style={styles.overallSubtitle}>
              Rank your favourites across every genre.
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
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
