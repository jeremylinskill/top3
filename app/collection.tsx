import RankedItemCard from '@/components/ranked-item-card';
import { useTop3 } from '@/context/top3-context';
import { Top3Item } from '@/types/top3-item';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

type DraggableRow = {
  key: string;
  item: Top3Item | null;
};

export default function CollectionScreen() {
  const { currentList, setItems } = useTop3();

  if (!currentList) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>No Collection Selected</Text>
      </SafeAreaView>
    );
  }

  const rows: DraggableRow[] = currentList.items.map((item, index) => ({
    key: item?.id ?? `empty-${index}`,
    item,
  }));

  function renderItem({
    item: row,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<DraggableRow>) {
    const index = getIndex() ?? 0;
    const rank = index + 1;

    return (
      <View style={[styles.row, isActive && styles.activeRow]}>
        <RankedItemCard
          rank={rank}
          item={row.item}
          placeholder={`Choose item #${rank}`}
          onPress={() =>
            router.push({
              pathname: '/movie-search',
              params: { rank: String(rank) },
            })
          }
        />

        {row.item ? (
          <Text
            style={styles.dragHandle}
            onLongPress={drag}
            suppressHighlighting>
            ☰
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{currentList.title}</Text>

      <Text style={styles.subtitle}>
        Tap a card to replace it. Press and hold the handle to reorder.
      </Text>

      <DraggableFlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        onDragEnd={({ data }) => {
          const reorderedItems = data.map((row) => row.item) as [
            Top3Item | null,
            Top3Item | null,
            Top3Item | null,
          ];

          setItems(reorderedItems);
        }}
        activationDistance={12}
        containerStyle={styles.list}
        extraData={currentList.items}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
  },
  list: {
    flex: 1,
  },
  row: {
    position: 'relative',
  },
  activeRow: {
    opacity: 0.9,
  },
  dragHandle: {
    position: 'absolute',
    right: 18,
    top: 38,
    fontSize: 24,
    color: '#777777',
    padding: 12,
  },
});