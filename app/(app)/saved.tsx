import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import { MediaPreviewItemButton } from '@/components/media-preview-button';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import {
    getCategoryArtworkRule,
} from '@/constants/category-artwork-rules';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import {
    CategoryId,
    TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useSavedItems } from '@/context/saved-items-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SavedFilter =
  | 'all'
  | 'albums'
  | 'artists'
  | 'books'
  | 'games'
  | 'movies'
  | 'podcasts'
  | 'songs'
  | 'tv';

type SavedSort = 'recent' | 'az';

type SavedFilterOption = {
  id: SavedFilter;
  label: string;
};

const FILTERS: SavedFilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'books', label: 'Books' },
  { id: 'games', label: 'Games' },
  { id: 'movies', label: 'Movies' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'songs', label: 'Songs' },
  { id: 'tv', label: 'TV' },
];

function matchesFilter(
  category: CategoryId,
  filter: SavedFilter
) {
  if (filter === 'all') {
    return true;
  }

  return category === filter;
}

export default function SavedScreen() {
  const colors = useAppColors();

  const {
    savedItems,
    isLoading,
    hasLoadError,
    retrySavedItemsLoad,
    unsaveItem,
  } = useSavedItems();

  const [activeFilter, setActiveFilter] =
    useState<SavedFilter>('all');

  const [sort, setSort] =
    useState<SavedSort>('recent');

  const [isSortSheetVisible, setIsSortSheetVisible] =
    useState(false);

  const visibleItems = useMemo(() => {
    const filteredItems = savedItems.filter(
      (savedItem) =>
        matchesFilter(
          savedItem.category,
          activeFilter
        )
    );

    return [...filteredItems].sort(
      (first, second) => {
        if (sort === 'az') {
          return first.item.title.localeCompare(
            second.item.title,
            undefined,
            {
              sensitivity: 'base',
            }
          );
        }

        return (
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime()
        );
      }
    );
  }, [activeFilter, savedItems, sort]);

  const activeFilterLabel =
    FILTERS.find(
      (filter) => filter.id === activeFilter
    )?.label ?? 'Saved';

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Saved"
        subtitle="Things you want to come back to."
      />

      <ActionSheet
        visible={isSortSheetVisible}
        title="Sort"
        actions={[
          {
            label:
              sort === 'recent'
                ? '✓ Recent'
                : 'Recent',
            onPress: () => {
              setSort('recent');
              setIsSortSheetVisible(false);
            },
          },
          {
            label:
              sort === 'az'
                ? '✓ A–Z'
                : 'A–Z',
            onPress: () => {
              setSort('az');
              setIsSortSheetVisible(false);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: () => {
              setIsSortSheetVisible(false);
            },
          },
        ]}
        onClose={() => {
          setIsSortSheetVisible(false);
        }}
      />

      <View style={styles.controlsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={
            styles.filterContent
          }>
          {FILTERS.map((filter) => {
            const isActive =
              filter.id === activeFilter;

            return (
              <Pressable
                key={filter.id}
                style={({ pressed }) => [
                  styles.filterButton,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surface,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setActiveFilter(filter.id)
                }
                accessibilityRole="button"
                accessibilityState={{
                  selected: isActive,
                }}
                accessibilityLabel={`Show ${filter.label} saved items`}>
                <AppText
                  variant="label"
                  tone={
                    isActive
                      ? 'onPrimary'
                      : 'primary'
                  }
                  emphasis="semibold">
                  {filter.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.sortButton,
            {
              backgroundColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
          onPress={() =>
            setIsSortSheetVisible(true)
          }
          accessibilityRole="button"
          accessibilityLabel={`Sort saved items. Current sort: ${
            sort === 'recent'
              ? 'Recent'
              : 'A to Z'
          }`}>
          <Ionicons
            name="swap-vertical-outline"
            size={17}
            color={colors.secondaryText}
          />

          <AppText
            variant="label"
            tone="secondary"
            emphasis="semibold">
            {sort === 'recent'
              ? 'Recent'
              : 'A–Z'}
          </AppText>

          <Ionicons
            name="chevron-down"
            size={15}
            color={colors.secondaryText}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.listScroller}
        contentContainerStyle={[
          styles.content,
          visibleItems.length === 0 &&
            styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              size="large"
              color={colors.text}
            />

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.loadingText}>
              Loading saved items…
            </AppText>
          </View>
        ) : hasLoadError && savedItems.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={colors.tertiaryText}
            />

            <AppText
              variant="sectionTitle"
              style={styles.emptyTitle}>
              Couldn’t load Saved
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              Check your connection and try again.
            </AppText>

            <PrimaryButton
              title="Try Again"
              onPress={retrySavedItemsLoad}
              style={styles.retryButton}
            />
          </View>
        ) : visibleItems.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}>
            <Ionicons
              name="bookmark-outline"
              size={30}
              color={colors.tertiaryText}
            />

            <AppText
              variant="sectionTitle"
              style={styles.emptyTitle}>
              {savedItems.length === 0
                ? 'Nothing saved yet'
                : `No saved ${activeFilterLabel.toLowerCase()}`}
            </AppText>

            <AppText
              variant="body"
              tone="tertiary"
              style={styles.emptyText}>
              {savedItems.length === 0
                ? 'Save something from a Top 3 and it will appear here.'
                : `You have not saved any ${activeFilterLabel.toLowerCase()} yet.`}
            </AppText>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleItems.map((savedItem) => {
              const category =
                TOP3_CATEGORIES.find(
                  (categoryItem) =>
                    categoryItem.id ===
                    savedItem.category
                );

              const artworkRule =
                getCategoryArtworkRule(
                  savedItem.category
                );

              const artworkWidth = 64;

              const artworkHeight = Math.max(
                64,
                Math.round(
                  (artworkRule.height /
                    artworkRule.width) *
                    artworkWidth
                )
              );

              return (
                <View
                  key={`${savedItem.category}:${savedItem.item.id}`}
                  style={[
                    styles.savedItem,
                    {
                      backgroundColor:
                        colors.surface,
                    },
                  ]}>
                  <View
                    style={[
                      styles.artworkContainer,
                      {
                        width: artworkWidth,
                        height: artworkHeight,
                        backgroundColor:
                          colors.border,
                      },
                    ]}>
                    {savedItem.item.imageUrl ? (
                      <Image
                        source={{
                          uri:
                            savedItem.item
                              .imageUrl,
                        }}
                        style={[
                          styles.artwork,
                          {
                            width:
                              artworkWidth,
                            height:
                              artworkHeight,
                          },
                        ]}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons
                        name={
                          category?.placeholderIcon ??
                          'image-outline'
                        }
                        size={25}
                        color={
                          colors.tertiaryText
                        }
                      />
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <AppText
                      variant="metadata"
                      tone="tertiary"
                      style={styles.categoryLabel}>
                      {category?.name ??
                        savedItem.category}
                    </AppText>

                    <AppText
                      variant="cardTitle"
                      style={styles.itemTitle}
                      numberOfLines={2}
                      ellipsizeMode="tail">
                      {savedItem.item.title}
                    </AppText>

                    {savedItem.item.subtitle ? (
                      <AppText
                        variant="subtitle"
                        tone="secondary"
                        style={styles.itemSubtitle}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {
                          savedItem.item
                            .subtitle
                        }
                      </AppText>
                    ) : null}
                  </View>

                  <View style={styles.itemActions}>
                    <MediaPreviewItemButton
                      item={savedItem.item}
                      category={
                        savedItem.category
                      }
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor:
                            colors.background,
                        },
                      ]}
                    />

                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        {
                          backgroundColor:
                            colors.background,
                        },
                        pressed &&
                          styles.pressed,
                      ]}
                      onPress={() =>
                        unsaveItem(
                          savedItem.category,
                          savedItem.item.id
                        )
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${savedItem.item.title} from Saved`}>
                      <Ionicons
                        name="bookmark"
                        size={19}
                        color={colors.text}
                      />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },

  filterScroller: {
    flex: 1,
    flexGrow: 1,
  },

  filterContent: {
    gap: SPACING.sm,
  },

  sortButton: {
    flexShrink: 0,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    borderRadius: 19,
  },

  filterButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listScroller: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  emptyContent: {
    flexGrow: 1,
  },

  list: {
    gap: SPACING.sm,
  },

  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    borderRadius: RADIUS.xl,
    padding: 12,
  },

  artworkContainer: {
    flexShrink: 0,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  artwork: {
    borderRadius: 9,
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  categoryLabel: {
    marginBottom: 3,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  itemSubtitle: {
    marginTop: 3,
    fontSize: 13,
  },

  itemActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 8,
  },

  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingState: {
    alignItems: 'center',
    paddingTop: 72,
  },

  loadingText: {
    marginTop: 12,
  },

  emptyState: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 36,
    paddingHorizontal: SPACING.xxl,
  },

  emptyTitle: {
    marginTop: SPACING.md,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },

  pressed: {
    opacity: 0.65,
  },
});
