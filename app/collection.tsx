import PrimaryButton from '@/components/primary-button';
import RankedItemCard from '@/components/ranked-item-card';
import ScreenHeader from '@/components/screen-header';
import { CategoryId } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { Top3Item } from '@/types/top3-item';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

type DraggableRow = {
  key: string;
  item: Top3Item;
};

const DRAG_INSTRUCTION_KEY = 'top3-drag-instruction-seen';

export default function CollectionScreen() {
  const {
    currentList,
    setItems,
    removeItemAtRank,
    publishCurrentList,
  } = useTop3();

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const selectedItems =
    currentList?.items.filter(
      (item): item is Top3Item => item !== null
    ) ?? [];

  const selectedItemCount = selectedItems.length;
  const emptySlotCount = 3 - selectedItemCount;
  const canPublish = selectedItemCount === 3;

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

        Alert.alert(
          'Reorder your Top 3',
          'Press and hold the grip, then drag a selection into its new position.',
          [
            {
              text: 'Got it',
              onPress: async () => {
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
          ]
        );
      } catch (error) {
        console.error(
          'Failed to load drag instruction status:',
          error
        );
      }
    }

    showDragInstruction();
  }, [selectedItemCount]);

  if (!currentList) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="No Collection Selected"
          showBackButton
        />
      </SafeAreaView>
    );
  }

  const category = currentList.category as CategoryId;

  const draggableRows: DraggableRow[] =
    selectedItems.map((item) => ({
      key: item.id,
      item,
    }));

  const relativeTime = formatRelativeTime(
    currentList.publishedAt ?? currentList.updatedAt
  );

  const timeText = relativeTime?.replace(
    /^Updated\s+/i,
    ''
  );

  const subtitle = timeText
    ? currentList.publishedAt
      ? `Published ${timeText}`
      : `Updated ${timeText}`
    : null;

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
    router.push({
      pathname: '/search',
      params: {
        rank: String(rank),
      },
    });
  }

  function openItemActions(
    rank: number,
    itemTitle: string
  ) {
    Alert.alert(
      itemTitle,
      'What would you like to do?',
      [
        {
          text: 'Replace',
          onPress: () => openSearch(rank),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItemAtRank(rank),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  function publishCollection() {
    if (!canPublish) {
      return;
    }

    publishCurrentList();
    router.replace('/(tabs)');
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
              openItemActions(rank, row.item.title)
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
                  onPress={() => openSearch(rank)}
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

    setItems(nextItems);
    setActiveIndex(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={currentList.title}
        subtitle={subtitle}
        showBackButton
      />

      <View style={styles.listArea}>
        {selectedItemCount > 0 ? (
          <DraggableFlatList
            data={draggableRows}
            keyExtractor={(row) => row.key}
            renderItem={renderItem}
            ListFooterComponent={renderEmptySlots}
            scrollEnabled={false}
            onDragBegin={setActiveIndex}
            onRelease={() => setActiveIndex(null)}
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
          disabled={!canPublish}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  listArea: {
    flex: 1,
    paddingHorizontal: 12,
  },

  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },

  row: {
    position: 'relative',
    paddingHorizontal: 6,
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

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});