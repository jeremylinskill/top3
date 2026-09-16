import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CollectionsScreen() {
  const colors = useAppColors();
  const { lists } = useTop3();

  function getCategory(categoryId: string) {
    return TOP3_CATEGORIES.find(
      (category) => category.id === categoryId
    );
  }

  function getCollectionIcon(
    categoryId: string,
    topic?: string
  ) {
    const category = getCategory(categoryId);

    if (!category) {
      return '⭐';
    }

    if (!topic) {
      return category.icon;
    }

    const topicConfig = category.topics.find(
      (item) =>
        item.name.toLowerCase() ===
        topic.toLowerCase()
    );

    return topicConfig?.icon ?? category.icon;
  }

  function getDisplayTitle(
    categoryId: string,
    topic?: string
  ) {
    const category = getCategory(categoryId);
    const categoryName =
      category?.name ?? categoryId;

    if (!topic) {
      return categoryName;
    }

    return `${categoryName} · ${topic}`;
  }

  const sortedLists = [...lists].sort(
    (firstList, secondList) => {
      const firstCategoryName =
        getCategory(firstList.category)?.name ??
        firstList.category;

      const secondCategoryName =
        getCategory(secondList.category)?.name ??
        secondList.category;

      const categoryComparison =
        firstCategoryName.localeCompare(
          secondCategoryName
        );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      const firstIsGeneral = !firstList.topic;
      const secondIsGeneral = !secondList.topic;

      if (firstIsGeneral && !secondIsGeneral) {
        return -1;
      }

      if (!firstIsGeneral && secondIsGeneral) {
        return 1;
      }

      return (firstList.topic ?? '').localeCompare(
        secondList.topic ?? ''
      );
    }
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <ScreenHeader title="My Top 3" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {sortedLists.map((list) => {
          const selectedCount =
            list.items.filter(Boolean).length;

          const isComplete =
            selectedCount === 3;

          const icon = getCollectionIcon(
            list.category,
            list.topic
          );

          return (
            <Pressable
              key={list.id}
              style={[
                styles.collectionCard,
                {
                  backgroundColor: colors.surface,
                },
              ]}
              onPress={() => {
                router.push({
                  pathname: '/collection',
                  params: {
                    listId: list.id,
                  },
                });
              }}>
              <Text style={styles.icon}>
                {icon}
              </Text>

              <View style={styles.collectionDetails}>
                <AppText
                  variant="sectionTitle"
                  emphasis="semibold"
                  style={styles.collectionTitle}>
                  {getDisplayTitle(
                    list.category,
                    list.topic
                  )}
                </AppText>

                {!isComplete ? (
                  <AppText
                    variant="body"
                    tone="tertiary"
                    style={styles.collectionSubtitle}>
                    {selectedCount} of 3 selected
                  </AppText>
                ) : null}
              </View>

              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.tertiaryText}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        <Pressable
          style={[
            styles.createButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push('/create-collection')
          }>
          <Ionicons
            name="add"
            size={20}
            color={colors.text}
          />

          <AppText
            variant="headline"
            emphasis="semibold"
            style={styles.createButtonText}>
            Create List
          </AppText>
        </Pressable>
      </View>
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

  list: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },

  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
  },

  icon: {
    fontSize: 28,
    marginRight: 14,
  },

  collectionDetails: {
    flex: 1,
    paddingRight: 12,
  },

  collectionTitle: {
    flexShrink: 1,
  },

  collectionSubtitle: {
    marginTop: 6,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },

  createButtonText: {
    marginLeft: 6,
  },
});
