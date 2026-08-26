import ActionSheet from '@/components/action-sheet';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import RankedItemCard from '@/components/ranked-item-card';
import ScreenHeader from '@/components/screen-header';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAuth } from '@/hooks/use-auth';
import { Top3Item } from '@/types/top3-item';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';


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
  | { type: 'delete-error' }
  | { type: 'delete-confirmation' }
  | null;


const DRAG_INSTRUCTION_KEY =
  'top3-drag-instruction-seen';


export default function CollectionScreen() {
  const {
    currentList,
    lists,
    isCollectionsLoaded,
    selectList,
    setItems: setCurrentListItems,
    removeItemAtRank: removeCurrentListItemAtRank,
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

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [
    collectionActionSheet,
    setCollectionActionSheet,
  ] = useState<CollectionActionSheet>(null);


  const selectedItems =
    activeCollection?.items.filter(
      (item): item is Top3Item => item !== null
    ) ?? [];


  const selectedItemCount = selectedItems.length;
  const emptySlotCount = 3 - selectedItemCount;

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
        console.error(
          'Failed to load drag instruction status:',
          error
        );
      }
    }


    showDragInstruction();
  }, [selectedItemCount]);


  if (
    requestedListId &&
    !isCollectionsLoaded
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator size="small" />
        </View>
      </SafeAreaView>
    );
  }


  if (!activeCollection) {
    return (
      <SafeAreaView style={styles.container}>
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
    activeCollection.title.replace(
      /^Top 3\s+/i,
      ''
    );


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


    setActiveIndex(index);
    drag();
  }


function openSearch(rank: number) {
  if (isOnboardingCollection) {
    router.push({
  pathname: '/search',
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
    if (!canPublish) {
      return;
    }


    if (isOnboardingCollection) {
      markPendingPublish();

      if (__DEV__ || !isAuthenticated) {
        router.push('/create-account');
      }

      return;
    }


    publishCurrentList();


    router.replace('/(tabs)');
  }


  async function deleteCollection() {
    if (
      isOnboardingCollection ||
      !persistedCollection ||
      isDeleting
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCurrentList();
      router.replace('/(tabs)');
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
      isDeleting
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
            placeholder={`Choose item #${rank}`}
            category={category}
            onPress={() =>
              openItemActions(
                rank,
                row.item.title
              )
            }
          />


          <Pressable
            style={[
              styles.dragHandleContainer,
              isActive &&
                styles.dragHandleContainerActive,
            ]}
            onLongPress={() =>
              beginDrag(index, drag)
            }
            delayLongPress={150}
            hitSlop={8}>
            <View style={styles.dragDivider} />


            <Ionicons
              name="reorder-three-outline"
              size={24}
              color={
                isActive
                  ? '#333333'
                  : '#777777'
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
                  placeholder={`Choose item #${rank}`}
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

    setActiveIndex(null);
  }


  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />


      <PageHeader
        title={`${categoryIcon} ${displayTitle}`}
        subtitle={subtitle ?? undefined}
      />


      <View style={styles.listArea}>
        {selectedItemCount > 0 ? (
          <DraggableFlatList
            data={draggableRows}
            keyExtractor={(row) => row.key}
            renderItem={renderItem}
            ListFooterComponent={
              renderEmptySlots
            }
            scrollEnabled={false}
            onDragBegin={setActiveIndex}
            onRelease={() =>
              setActiveIndex(null)
            }
            onDragEnd={({ data }) =>
              saveReorderedItems(data)
            }
            activationDistance={12}
            dragItemOverflow
            removeClippedSubviews={false}
            contentContainerStyle={
              styles.listContent
            }
            extraData={activeIndex}
          />
        ) : (
          <View style={styles.listContent}>
            {renderEmptySlots()}
          </View>
        )}
      </View>


      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Publish Top 3"
          onPress={publishCollection}
          disabled={!canPublish || isDeleting}
        />

        {!isOnboardingCollection &&
        persistedCollection ? (
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed &&
                !isDeleting &&
                styles.deleteButtonPressed,
            ]}
            onPress={confirmDeleteCollection}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Delete list"
            accessibilityState={{
              disabled: isDeleting,
            }}>
            <Text style={styles.deleteButtonText}>
              {isDeleting
                ? 'Deleting…'
                : 'Delete List'}
            </Text>
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
    backgroundColor: '#F8F8F8',
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


  listContent: {
    paddingHorizontal: 8,
    paddingTop: 0,
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
    top: 8,
    bottom: 8,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFCFC',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },


  dragHandleContainerActive: {
    backgroundColor: '#F2F2F2',
  },


  dragDivider: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5E5',
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


  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});