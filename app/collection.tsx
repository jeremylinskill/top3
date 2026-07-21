import RankedItemCard from '@/components/ranked-item-card';
import { useTop3 } from '@/context/top3-context';
import { Top3Item } from '@/types/top3-item';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
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
  const { currentList, setItems } = useTop3();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const selectedItems =
    currentList?.items.filter(
      (item): item is Top3Item => item !== null
    ) ?? [];

  const selectedItemCount = selectedItems.length;
  const emptySlotCount = 3 - selectedItemCount;

  useEffect(() => {
    async function showDragInstruction() {
      if (selectedItemCount < 2) {
        return;
      }

      try {
        const hasSeenInstruction = await AsyncStorage.getItem(
          DRAG_INSTRUCTION_KEY
        );

        if (hasSeenInstruction) {
          return;
        }

        Alert.alert(
          'Reorder your Top 3',
          'Press and hold the ⋮⋮ grip, then drag a selection into its new position.',
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
        console.error('Failed to load drag instruction status:', error);
      }
    }

    showDragInstruction();
  }, [selectedItemCount]);

  if (!currentList) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>No Collection Selected</Text>
      </SafeAreaView>
    );
  }

  const draggableRows: DraggableRow[] = selectedItems.map((item) => ({
    key: item.id,
    item,
  }));

  async function beginDrag(index: number, drag: () => void) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }

    setActiveIndex(index);
    drag();
  }

  function openSearch(rank: number) {
    router.push({
      pathname: '/search',
      params: { rank: String(rank) },
    });
  }

  function renderItem({
    item: row,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DraggableRow>) {
    const index = getIndex() ?? 0;
    const rank = index + 1;
    const shouldFade = activeIndex !== null && activeIndex !== index;

    return (
      <View style={[styles.row, shouldFade && styles.fadedRow]}>
        <View style={[styles.cardWrapper, isActive && styles.activeCard]}>
          <RankedItemCard
            rank={rank}
            item={row.item}
            placeholder={`Choose item #${rank}`}
            onPress={() => openSearch(rank)}
          />

          <Pressable
            style={[
              styles.dragHandleContainer,
              isActive && styles.dragHandleContainerActive,
            ]}
            onLongPress={() => beginDrag(index, drag)}
            delayLongPress={150}
            hitSlop={8}>
            <View style={styles.dragDivider} />

            <Ionicons
  name="reorder-three-outline"
  size={24}
  color={isActive ? '#333333' : '#777777'}
/>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderEmptySlots() {
    return (
      <View>
        {Array.from({ length: emptySlotCount }, (_, index) => {
          const rank = selectedItemCount + index + 1;

          return (
            <View key={`empty-${rank}`} style={styles.row}>
              <RankedItemCard
                rank={rank}
                item={null}
                placeholder={`Choose item #${rank}`}
                onPress={() => openSearch(rank)}
              />
            </View>
          );
        })}
      </View>
    );
  }

  function saveReorderedItems(data: DraggableRow[]) {
    const reorderedItems = data.map((row) => row.item);

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
      <Text style={styles.title}>{currentList.title}</Text>

      <Text style={styles.subtitle}>
        Tap a card to replace it. Press and hold the grip to reorder.
      </Text>

      {selectedItemCount > 0 ? (
        <DraggableFlatList
          data={draggableRows}
          keyExtractor={(row) => row.key}
          renderItem={renderItem}
          ListFooterComponent={renderEmptySlots}
          scrollEnabled={false}
          onDragBegin={setActiveIndex}
          onRelease={() => setActiveIndex(null)}
          onDragEnd={({ data }) => saveReorderedItems(data)}
          activationDistance={12}
          dragItemOverflow
          removeClippedSubviews={false}
          contentContainerStyle={styles.listContent}
          extraData={activeIndex}
        />
      ) : (
        <View style={styles.listContent}>{renderEmptySlots()}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 8,
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
  
});