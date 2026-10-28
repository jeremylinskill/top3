import { formatCollectionDisplayTitle } from '@/utils/build-collection-title';
import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import RankedItemCard from '@/components/ranked-item-card';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { useAuth } from '@/hooks/use-auth';
import { Top3Item } from '@/types/top3-item';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  router,
  useLocalSearchParams,
  useNavigation,
  useFocusEffect,
} from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';


type DraggableRow = {
  key: string;
  item: Top3Item;
};


type CollectionActionSheet =
  | { type: 'drag-instruction' }
  | {
      type: 'item-actions';
      rank: number;
      itemTitle: string;
    }
  | { type: 'publish-error' }
  | { type: 'delete-error' }
  | { type: 'delete-confirmation' }
  | null;


const DRAG_INSTRUCTION_KEY =
  'top3-drag-instruction-seen';


export default function CollectionScreen() {
  const colors = useAppColors();

  const {
    currentList,
    lists,
    resolvedPendingList,
    isCollectionsLoaded,
    hasCollectionsLoadError,
    retryCollectionsLoad,
    selectList,
    setItems: setCurrentListItems,
    removeItemAtRank: removeCurrentListItemAtRank,
    discardPublishedListChanges,
    publishCurrentList,
    deleteCurrentList,
  } = useTop3();


  const {
    collection: onboardingCollection,
    setItems: setOnboardingItems,
    removeItemAtRank:
      removeOnboardingItemAtRank,
    markPendingPublish,
    clearCollection:
      clearOnboardingCollection,
  } = useOnboardingCollection();


  const {
    profile,
  } = useProfile();


  const {
    user,
    isAuthenticated,
  } = useAuth();


  const params =
    useLocalSearchParams<{
      listId?: string | string[];
    }>();


  const requestedListId =
    Array.isArray(params.listId)
      ? params.listId[0]
      : params.listId;


  const requestedList =
    requestedListId
      ? lists.find(
          (list) =>
            list.id === requestedListId
        ) ?? null
      : null;


  useEffect(() => {
    if (
      requestedListId &&
      currentList?.id !== requestedListId
    ) {
      selectList(requestedListId);
    }
  }, [
    requestedListId,
    currentList?.id,
    selectList,
  ]);

  // DEFER_LIST_CREATION_UNTIL_FIRST_ITEM_20261025
  // Once the first choice is saved, replace the temporary route identifier
  // so re-opening, refreshing and selecting more items use the real row ID.
  useFocusEffect(
    useCallback(() => {
      if (
        requestedListId &&
        resolvedPendingList?.temporaryId === requestedListId &&
        currentList?.id === resolvedPendingList.savedId
      ) {
        router.setParams({ listId: resolvedPendingList.savedId });
      }
    }, [requestedListId, resolvedPendingList, currentList?.id])
  );


  const isOnboardingCollection =
    !requestedListId &&
    onboardingCollection !== null;


  const activeCollection =
    isOnboardingCollection
      ? onboardingCollection
      : requestedList ??
        currentList;


  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const insets = useSafeAreaInsets();
  const ignoreCollectionScroll = useCallback((_offset: number) => {}, []);
  const ignoreCollectionScrolled = useCallback((_scrolled: boolean) => {}, []);
  const {
    scrollHandler: onEmptyCollectionScroll,
    headerStyle: emptyCollectionHeaderStyle,
  } = useHomeStickyHeader(ignoreCollectionScroll, ignoreCollectionScrolled);

  // DraggableFlatList owns its Reanimated scroll handler internally and only
  // exposes scroll offsets through onScrollOffsetChange. Keep that contract,
  // and update a shared animated header position without React state renders.
  const draggableHeaderOffset = useSharedValue(0);
  const draggableHeaderStyle = useAnimatedStyle(() => ({
    opacity: 1 - draggableHeaderOffset.value / SCREEN_HEADER_HEIGHT,
    transform: [{ translateY: -draggableHeaderOffset.value }],
  }));
  const previousDraggableOffset = useRef(0);
  const reverseScrollDistance = useRef(0);
  const lastDraggableDirection = useRef(0);
  const isReorderingRef = useRef(false);

  function handleDraggableScroll(offsetY: number) {
    const y = Math.max(0, offsetY);
    const delta = y - previousDraggableOffset.current;
    previousDraggableOffset.current = y;

    // The draggable list can auto-scroll while moving an item. Its drag/drop
    // scroll events must not move the navigation header.
    if (isReorderingRef.current) return;

    if (y <= 2) {
      draggableHeaderOffset.value = 0;
      lastDraggableDirection.current = 0;
      reverseScrollDistance.current = 0;
      return;
    }

    if (delta < -0.5) {
      // Start the reveal once per upward gesture; restarting withTiming on
      // every offset callback would make the header lag behind the finger.
      if (lastDraggableDirection.current !== -1) {
        draggableHeaderOffset.value = withTiming(0, { duration: 110 });
      }
      lastDraggableDirection.current = -1;
      reverseScrollDistance.current = 0;
    } else if (delta > 0.5) {
      if (lastDraggableDirection.current < 0) {
        // Ignore a small downward rebound immediately after revealing the
        // header, but allow an intentional new downward scroll to hide it.
        reverseScrollDistance.current += delta;
        if (reverseScrollDistance.current < 10) return;
        lastDraggableDirection.current = 1;
        reverseScrollDistance.current = 0;
      }
      draggableHeaderOffset.value = Math.min(
        SCREEN_HEADER_HEIGHT,
        draggableHeaderOffset.value + delta,
      );
    }
  }

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [isPublishing, setIsPublishing] =
    useState(false);

  const navigation = useNavigation();

  const [
    collectionActionSheet,
    setCollectionActionSheet,
  ] = useState<CollectionActionSheet>(null);


  const selectedItems =
    activeCollection?.items.filter(
      (item): item is Top3Item => item !== null
    ) ?? [];


  const selectedItemCount = selectedItems.length;
  const hasDraggableItemsForHeaderReset = selectedItemCount > 0;
  const emptySlotCount = 3 - selectedItemCount;

  // Moving between empty and draggable layouts, or opening another list,
  // should never inherit a header position from the previous layout/list.
  useEffect(() => {
    draggableHeaderOffset.value = 0;
    previousDraggableOffset.current = 0;
    reverseScrollDistance.current = 0;
    lastDraggableDirection.current = 0;
    isReorderingRef.current = false;
  }, [requestedListId, currentList?.id, isOnboardingCollection, hasDraggableItemsForHeaderReset, draggableHeaderOffset]);

  const persistedCollection =
    isOnboardingCollection
      ? null
      : requestedList ??
        currentList;

  const hasUnpublishedChanges =
    !persistedCollection?.publishedAt ||
    !persistedCollection.updatedAt ||
    new Date(persistedCollection.updatedAt).getTime() >
      new Date(
        persistedCollection.publishedAt
      ).getTime();

  const canPublish =
    selectedItemCount === 3 &&
    hasUnpublishedChanges;

  const publishedCollectionId =
    persistedCollection?.publishedAt
      ? persistedCollection.id
      : null;

  useEffect(() => {
    if (!publishedCollectionId) {
      return;
    }

    const unsubscribe = navigation.addListener(
      'beforeRemove',
      () => {
        discardPublishedListChanges(
          publishedCollectionId
        );
      }
    );

    return unsubscribe;
  }, [
    discardPublishedListChanges,
    navigation,
    publishedCollectionId,
  ]);


  useEffect(() => {
    async function showDragInstruction() {
      if (selectedItemCount < 2) {
        return;
      }


      try {
        const hasSeenInstruction =
          await AsyncStorage.getItem(
            DRAG_INSTRUCTION_KEY
          );


        if (hasSeenInstruction) {
          return;
        }


        setCollectionActionSheet({
          type: 'drag-instruction',
        });
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load drag instruction status:',
            error
          );
        }
      }
    }


    showDragInstruction();
  }, [selectedItemCount]);


  if (
    requestedListId &&
    hasCollectionsLoadError
  ) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.loadErrorState}>
          <AppText
            variant="sectionTitle"
            style={styles.loadErrorTitle}>
            Couldn’t load this Top 3
          </AppText>

          <AppText
            variant="body"
            style={styles.loadErrorText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={retryCollectionsLoad}
            style={styles.loadErrorButton}
          />
        </View>
      </SafeAreaView>
    );
  }


  if (
    requestedListId &&
    !isCollectionsLoaded
  ) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color={colors.secondaryText}
          />
        </View>
      </SafeAreaView>
    );
  }


  if (!activeCollection) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />


        <PageHeader title="No List Selected" />
      </SafeAreaView>
    );
  }


  const category =
    activeCollection.category as CategoryId;


  const categoryIcon =
    TOP3_CATEGORIES.find(
      (categoryItem) =>
        categoryItem.id === category
    )?.icon ?? '⭐';


  const displayTitle =
    formatCollectionDisplayTitle(activeCollection.title);


  const draggableRows: DraggableRow[] =
    selectedItems.map((item, index) => ({
      key: `${item.id}-${index}`,
      item,
    }));


  const hasSelections = activeCollection.items.some(
    (item) => item !== null
  );


  const subtitle = (() => {
    if (isOnboardingCollection) {
      return 'Choose your three favorites.';
    }


    if (!currentList) {
      return undefined;
    }


    if (!hasSelections && !currentList.publishedAt) {
      return 'Choose your three favorites.';
    }


    const relativeTime = formatRelativeTime(
      currentList.publishedAt ??
        currentList.updatedAt
    );


    const timeText = relativeTime?.replace(
      /^Updated\s+/i,
      ''
    );


    if (!timeText) {
      return undefined;
    }


    return currentList.publishedAt
      ? `Published ${timeText}`
      : `Updated ${timeText}`;
  })();


  async function beginDrag(
    index: number,
    drag: () => void
  ) {
    try {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Light
      );
    } catch (error) {
      console.error(
        'Failed to trigger haptic feedback:',
        error
      );
    }


    isReorderingRef.current = true;
    setActiveIndex(index);
    drag();
  }


function openSearch(rank: number) {
  if (isOnboardingCollection) {
    router.push({
  pathname: '/onboarding-search',
  params: {
    rank: String(rank),
    source: 'onboarding',
  },
});
    return;
  }

  const searchCollection =
    requestedList ??
    currentList;

  if (!searchCollection) {
    return;
  }

  router.push({
    pathname: '/search',
    params: {
      rank: String(rank),
      listId: searchCollection.id,
    },
  });
}


  function openItemActions(
    rank: number,
    itemTitle: string
  ) {
    setCollectionActionSheet({
      type: 'item-actions',
      rank,
      itemTitle,
    });
  }


  async function publishCollection() {
    if (
      !canPublish ||
      isPublishing ||
      isDeleting
    ) {
      return;
    }

    if (isOnboardingCollection) {
      markPendingPublish();

      if (__DEV__ || !isAuthenticated) {
        router.push('/create-account');
      }

      return;
    }

    setIsPublishing(true);

    try {
      await publishCurrentList();
      router.replace('/feed');
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to publish collection:',
          error
        );
      }

      setCollectionActionSheet({
        type: 'publish-error',
      });
    } finally {
      setIsPublishing(false);
    }
  }


  async function deleteCollection() {
    if (
      isOnboardingCollection ||
      !persistedCollection ||
      isDeleting ||
      isPublishing
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCurrentList();
      router.replace('/feed');
    } catch (error) {
      console.error(
        'Failed to delete collection:',
        error
      );

      setCollectionActionSheet({
        type: 'delete-error',
      });
    } finally {
      setIsDeleting(false);
    }
  }


  function confirmDeleteCollection() {
    if (
      isOnboardingCollection ||
      !persistedCollection ||
      isDeleting ||
      isPublishing
    ) {
      return;
    }

    setCollectionActionSheet({
      type: 'delete-confirmation',
    });
  }


  function closeCollectionActionSheet() {
    setCollectionActionSheet(null);
  }

  let collectionActionSheetTitle = '';
  let collectionActionSheetMessage = '';
  let collectionActionSheetActions: {
    label: string;
    variant?: 'default' | 'destructive' | 'cancel';
    onPress: () => void | Promise<void>;
  }[] = [];

  if (collectionActionSheet) {
    switch (collectionActionSheet.type) {
      case 'drag-instruction':
        collectionActionSheetTitle =
          'Reorder your Top 3';
        collectionActionSheetMessage =
          'Press and hold the grip, then drag a selection into its new position.';
        collectionActionSheetActions = [
          {
            label: 'Got it',
            onPress: async () => {
              closeCollectionActionSheet();

              try {
                await AsyncStorage.setItem(
                  DRAG_INSTRUCTION_KEY,
                  'true'
                );
              } catch (error) {
                console.error(
                  'Failed to save drag instruction status:',
                  error
                );
              }
            },
          },
        ];
        break;

      case 'item-actions': {
        const { rank, itemTitle } =
          collectionActionSheet;

        collectionActionSheetTitle = itemTitle;
        collectionActionSheetMessage =
          'What would you like to do?';
        collectionActionSheetActions = [
          {
            label: 'Replace',
            onPress: () => {
              closeCollectionActionSheet();
              openSearch(rank);
            },
          },
          {
            label: 'Remove',
            variant: 'destructive',
            onPress: () => {
              closeCollectionActionSheet();

              if (isOnboardingCollection) {
                removeOnboardingItemAtRank(rank);
                return;
              }

              removeCurrentListItemAtRank(rank);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeCollectionActionSheet,
          },
        ];
        break;
      }

      case 'publish-error':
        collectionActionSheetTitle =
          'Could not publish Top 3';
        collectionActionSheetMessage =
          'Please try again.';
        collectionActionSheetActions = [
          {
            label: 'OK',
            onPress: closeCollectionActionSheet,
          },
        ];
        break;

      case 'delete-error':
        collectionActionSheetTitle =
          'Could not delete list';
        collectionActionSheetMessage =
          'Please try again.';
        collectionActionSheetActions = [
          {
            label: 'OK',
            onPress: closeCollectionActionSheet,
          },
        ];
        break;

      case 'delete-confirmation':
        collectionActionSheetTitle =
          'Delete this Top 3?';
        collectionActionSheetMessage =
          'This will permanently delete this list and remove it from your profile, feed, and rankings.';
        collectionActionSheetActions = [
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeCollectionActionSheet,
          },
          {
            label: 'Delete',
            variant: 'destructive',
            onPress: () => {
              closeCollectionActionSheet();
              void deleteCollection();
            },
          },
        ];
        break;
    }
  }


  function renderItem({
    item: row,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DraggableRow>) {
    const index = getIndex() ?? 0;
    const rank = index + 1;


    const shouldFade =
      activeIndex !== null &&
      activeIndex !== index;


    return (
      <View
        style={[
          styles.row,
          shouldFade && styles.fadedRow,
        ]}>
        <View
          style={[
            styles.cardWrapper,
            isActive && styles.activeCard,
          ]}>
          <RankedItemCard
            rank={rank}
            item={row.item}
            placeholder={`Choose your #${rank}`}
            category={category}
            onPress={() =>
              openItemActions(
                rank,
                row.item.title
              )
            }
          />


          <Pressable
            style={({ pressed }) => [
              styles.dragHandleContainer,
              {
                // Shade the complete right-hand drag rail as soon as the
                // finger touches it, and keep it shaded while dragging.
                backgroundColor: isActive || pressed
                  ? colors.secondarySurface
                  : colors.surface,
              },
            ]}
            onLongPress={() =>
              beginDrag(index, drag)
            }
            delayLongPress={150}
            hitSlop={8}>
            <View
              style={[
                styles.dragDivider,
                {
                  backgroundColor: colors.border,
                },
              ]}
            />


            <Ionicons
              name="reorder-three-outline"
              size={24}
              color={
                isActive
                  ? colors.text
                  : colors.secondaryText
              }
            />
          </Pressable>
        </View>
      </View>
    );
  }


  function renderEmptySlots() {
    return (
      <View>
        {Array.from(
          { length: emptySlotCount },
          (_, index) => {
            const rank =
              selectedItemCount + index + 1;


            return (
              <View
                key={`empty-${rank}`}
                style={styles.row}>
                <RankedItemCard
                  rank={rank}
                  item={null}
                  placeholder={`Choose your #${rank}`}
                  category={category}
                  onPress={() =>
                    openSearch(rank)
                  }
                />
              </View>
            );
          }
        )}
      </View>
    );
  }


  function saveReorderedItems(
    data: DraggableRow[]
  ) {
    const reorderedItems = data.map(
      (row) => row.item
    );


    const nextItems = [
      ...reorderedItems,
      ...Array(emptySlotCount).fill(null),
    ] as [
      Top3Item | null,
      Top3Item | null,
      Top3Item | null,
    ];


    if (isOnboardingCollection) {
      setOnboardingItems(nextItems);
    } else {
      setCurrentListItems(nextItems);
    }

    isReorderingRef.current = false;
    setActiveIndex(null);
  }


  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
        edges={['left', 'right', 'bottom']}>
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
            selectedItemCount > 0
              ? draggableHeaderStyle
              : emptyCollectionHeaderStyle,
          ]}>
          <ScreenHeader
            showBackButton
            overlay
            featheredBackdrop
            androidStatusBarGlass
          />
        </Reanimated.View>

      <View style={styles.listArea}>
        {selectedItemCount > 0 ? (
          <DraggableFlatList
            data={draggableRows}
            keyExtractor={(row) => row.key}
            renderItem={renderItem}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <PageHeader
                  title={`${categoryIcon} ${displayTitle}`}
                  subtitle={subtitle ?? undefined}
                />
              </View>
            }
            ListFooterComponent={
              renderEmptySlots
            }
            scrollEnabled={true}
            onScrollOffsetChange={handleDraggableScroll}
            onDragBegin={(index) => {
              isReorderingRef.current = true;
              setActiveIndex(index);
            }}
            onRelease={() => {
              // Drop animation can still auto-scroll; keep the header fixed
              // until onDragEnd finishes saving the reordered items.
              setActiveIndex(null);
            }}
            onDragEnd={({ data }) =>
              saveReorderedItems(data)
            }
            activationDistance={12}
            dragItemOverflow
            removeClippedSubviews={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: SCREEN_HEADER_HEIGHT + insets.top },
            ]}
            extraData={activeIndex}
          />
        ) : (
          <Reanimated.ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: SCREEN_HEADER_HEIGHT + insets.top },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={onEmptyCollectionScroll}
            scrollEventThrottle={16}>
            <View style={styles.listHeader}>
              <PageHeader
                title={`${categoryIcon} ${displayTitle}`}
                subtitle={subtitle ?? undefined}
              />
            </View>
            {renderEmptySlots()}
          </Reanimated.ScrollView>
        )}
      </View>


      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <PrimaryButton
          title={
            isPublishing
              ? 'Publishing…'
              : persistedCollection?.publishedAt
                ? 'Publish Update'
                : 'Publish Top 3'
          }
          onPress={publishCollection}
          disabled={
            !canPublish ||
            isDeleting ||
            isPublishing
          }
        />

        {!isOnboardingCollection &&
        persistedCollection &&
        !persistedCollection.id.startsWith('pending-list:') ? (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed &&
                !isDeleting &&
                !isPublishing &&
                styles.deleteButtonPressed,
            ]}
            onPress={confirmDeleteCollection}
            disabled={
              isDeleting || isPublishing
            }
            accessibilityRole="button"
            accessibilityLabel="Delete list"
            accessibilityState={{
              disabled:
                isDeleting || isPublishing,
            }}>
            <AppText
              variant="bodyLarge"
              tone="destructive"
              emphasis="semibold">
              {isDeleting
                ? 'Deleting…'
                : 'Delete List'}
            </AppText>
          </Pressable>
        ) : null}
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={collectionActionSheet !== null}
        title={collectionActionSheetTitle}
        message={collectionActionSheetMessage}
        actions={collectionActionSheetActions}
        onClose={closeCollectionActionSheet}
      />
    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },


  loadErrorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  loadErrorTitle: {
    textAlign: 'center',
  },

  loadErrorText: {
    marginTop: 8,
    textAlign: 'center',
  },

  loadErrorButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  listArea: {
    flex: 1,
    paddingHorizontal: 12,
  },


  listHeader: {
    marginHorizontal: -20,
  },

  listContent: {
    paddingHorizontal: 8,
    paddingTop: SCREEN_HEADER_HEIGHT,
    paddingBottom: 24,
  },


  row: {
    position: 'relative',
    paddingHorizontal: 6,
      marginBottom: 12,
    opacity: 1,
    overflow: 'visible',
  },


  fadedRow: {
    opacity: 0.72,
  },


  cardWrapper: {
    position: 'relative',
    overflow: 'visible',
  },


  activeCard: {
    zIndex: 20,
    elevation: 20,
    transform: [{ translateY: -4 }],
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },


  dragHandleContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },


  dragDivider: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },


  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
  },


  deleteButtonPressed: {
    opacity: 0.6,
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
});