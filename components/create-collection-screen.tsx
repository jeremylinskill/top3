import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_ORDER: CategoryId[] = [
  'albums',
  'artists',
  'books',
  'movies',
  'songs',
  'tv',
  'games',
];

export default function CreateCollectionScreen() {
  const colors = useAppColors();

  const params =
    useLocalSearchParams<{
      categoryId?: string | string[];
      topicId?: string | string[];
    }>();

  const requestedCategoryId =
    Array.isArray(params.categoryId)
      ? params.categoryId[0]
      : params.categoryId;

  const requestedTopicId =
    Array.isArray(params.topicId)
      ? params.topicId[0]
      : params.topicId;

  useEffect(() => {
    if (!requestedCategoryId) {
      return;
    }

    router.replace(
      {
        pathname: '/create-topic',
        params: {
          categoryId: requestedCategoryId,
          ...(requestedTopicId
            ? { topicId: requestedTopicId }
            : {}),
        },
      } as never
    );
  }, [
    requestedCategoryId,
    requestedTopicId,
  ]);

  const categories =
    CATEGORY_ORDER
      .map((categoryId) =>
        TOP3_CATEGORIES.find(
          (category) =>
            category.id === categoryId
        )
      )
      .filter(
        (
          category
        ): category is NonNullable<
          (typeof TOP3_CATEGORIES)[number]
        > => Boolean(category)
      );

  function chooseCategory(
    categoryId: CategoryId
  ) {
    router.push(
      {
        pathname: '/create-topic',
        params: {
          categoryId,
        },
      } as never
    );
  }

  if (requestedCategoryId) {
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
        <ScreenHeader />

        <View style={styles.redirecting} />
      </SafeAreaView>
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
      <ScreenHeader />

      <PageHeader
        title="Create a Top 3"
        subtitle="What would you like to rank?"
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
        showsVerticalScrollIndicator={false}>
        <View style={styles.categoryGrid}>
          {categories.map(
            (category, index) => {
              const isLastOddCard =
                categories.length % 2 === 1 &&
                index ===
                  categories.length - 1;

              return (
                <View
                  key={category.id}
                  style={[
                    styles.categoryCardWrapper,
                    isLastOddCard &&
                      styles.lastCategoryCard,
                  ]}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor:
                          colors.surface,
                        borderColor:
                          colors.border,
                      },
                      pressed &&
                        styles.categoryCardPressed,
                    ]}
                    onPress={() =>
                      chooseCategory(
                        category.id
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Create a Top 3 ${category.name} list`
                    }>
                    <Text
                      style={
                        styles.categoryIcon
                      }>
                      {category.icon}
                    </Text>

                    <Text
                      style={[
                        styles.categoryLabel,
                        {
                          color:
                            colors.text,
                        },
                      ]}>
                      {category.name}
                    </Text>
                  </Pressable>
                </View>
              );
            }
          )}
        </View>
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
    paddingBottom: 36,
  },

  categoryGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  categoryCardWrapper: {
    width: '48.5%',
  },

  lastCategoryCard: {
    marginLeft: '25.75%',
  },

  categoryCard: {
    width: '100%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderRadius: 18,
  },

  categoryCardPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  categoryIcon: {
    fontSize: 30,
    lineHeight: 38,
  },

  categoryLabel: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },

  redirecting: {
    flex: 1,
  },
});
