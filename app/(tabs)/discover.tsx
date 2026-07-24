import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { getHydratedFeedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DiscoverCategory = {
  id: string;
  name: string;
  icon: string;
};

type PopularTopic = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  topic: string;
  listCount: number;
};

const DISCOVER_CATEGORIES: DiscoverCategory[] =
  [...TOP3_CATEGORIES]
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    )
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
    }));

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function formatTopicLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export default function DiscoverScreen() {
  const { posts } = useTop3();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);

      try {
        const hydratedPosts =
          await getHydratedFeedPosts(posts);

        if (isMounted) {
          setAllPosts(hydratedPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load Discover content:',
          error
        );

        if (isMounted) {
          setAllPosts(posts);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, [posts]);

  const publishedCountByCategory = useMemo(
    () => {
      const counts = new Map<string, number>();

      allPosts.forEach((post) => {
        const categoryId = normalizeValue(
          post.collection.category
        );

        if (!categoryId) {
          return;
        }

        counts.set(
          categoryId,
          (counts.get(categoryId) ?? 0) + 1
        );
      });

      return counts;
    },
    [allPosts]
  );

  const popularTopics = useMemo<
    PopularTopic[]
  >(() => {
    const topicMap = new Map<
      string,
      PopularTopic
    >();

    allPosts.forEach((post) => {
      const categoryId = normalizeValue(
        post.collection.category
      );

      const rawTopic =
        post.collection.topic?.trim();

      if (!categoryId || !rawTopic) {
        return;
      }

      const normalizedTopic =
        normalizeValue(rawTopic);

      if (
        !normalizedTopic ||
        normalizedTopic === 'general'
      ) {
        return;
      }

      const category =
        TOP3_CATEGORIES.find(
          (item) =>
            normalizeValue(item.id) ===
            categoryId
        );

      if (!category) {
        return;
      }

      const topicId =
        `${categoryId}:` +
        normalizedTopic;

      const existingTopic =
        topicMap.get(topicId);

      if (existingTopic) {
        existingTopic.listCount += 1;
        return;
      }

      topicMap.set(topicId, {
        id: topicId,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        topic: formatTopicLabel(rawTopic),
        listCount: 1,
      });
    });

    return Array.from(topicMap.values())
      .sort((first, second) => {
        if (
          second.listCount !== first.listCount
        ) {
          return (
            second.listCount -
            first.listCount
          );
        }

        const topicComparison =
          first.topic.localeCompare(
            second.topic
          );

        if (topicComparison !== 0) {
          return topicComparison;
        }

        return first.categoryName.localeCompare(
          second.categoryName
        );
      })
      .slice(0, 10);
  }, [allPosts]);

  function getPublishedCount(
    categoryId: string
  ) {
    return (
      publishedCountByCategory.get(
        normalizeValue(categoryId)
      ) ?? 0
    );
  }

  function getPublishedCountLabel(
    categoryId: string
  ) {
    if (isLoading) {
      return 'Loading published Top 3s…';
    }

    const count = getPublishedCount(
      categoryId
    );

    if (count === 0) {
      return 'No published Top 3s yet';
    }

    if (count === 1) {
      return '1 published Top 3';
    }

    return `${count} published Top 3s`;
  }

  function getTopicCountLabel(
    count: number
  ) {
    if (count === 1) {
      return '1 published Top 3';
    }

    return `${count} published Top 3s`;
  }

  function openCategoryFeed(
    categoryId: string
  ) {
    router.push({
      pathname: '/category-feed',
      params: {
        category: categoryId,
        topic: 'general',
      },
    });
  }

  function openTopicFeed(
    topic: PopularTopic
  ) {
    router.push({
      pathname: '/category-feed',
      params: {
        category: topic.categoryId,
        topic: normalizeValue(topic.topic),
      },
    });
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingSection}>
          <Text style={styles.title}>
            Discover Top 3s
          </Text>

          <Text style={styles.subtitle}>
            Browse published lists by category
            and see what the community ranks
            highest overall.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Categories
        </Text>

        <View style={styles.categoryList}>
          {DISCOVER_CATEGORIES.map(
            (category) => (
              <Pressable
                key={category.id}
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  openCategoryFeed(category.id)
                }
                accessibilityRole="button"
                accessibilityLabel={`Browse ${category.name} Top 3 lists`}>
                <View
                  style={styles.iconContainer}>
                  <Text style={styles.icon}>
                    {category.icon}
                  </Text>
                </View>

                <View
                  style={styles.categoryDetails}>
                  <Text
                    style={styles.categoryName}>
                    {category.name}
                  </Text>

                  <View
                    style={
                      styles.categoryMetaRow
                    }>
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color="#999999"
                      />
                    ) : null}

                    <Text
                      style={[
                        styles.categoryMeta,
                        isLoading &&
                          styles
                            .categoryMetaLoading,
                      ]}>
                      {getPublishedCountLabel(
                        category.id
                      )}
                    </Text>
                  </View>
                </View>

                <Text style={styles.arrow}>
                  ›
                </Text>
              </Pressable>
            )
          )}
        </View>

        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>
            Popular Topics
          </Text>

          {isLoading ? (
            <View style={styles.topicsLoading}>
              <ActivityIndicator
                size="small"
                color="#777777"
              />

              <Text
                style={styles.topicsLoadingText}>
                Loading popular topics…
              </Text>
            </View>
          ) : popularTopics.length === 0 ? (
            <View style={styles.emptyTopics}>
              <Text
                style={styles.emptyTopicsTitle}>
                No popular topics yet
              </Text>

              <Text
                style={styles.emptyTopicsText}>
                Topic-specific Top 3s will appear
                here as people publish them.
              </Text>
            </View>
          ) : (
            <View style={styles.topicList}>
              {popularTopics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={({ pressed }) => [
                    styles.topicCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    openTopicFeed(topic)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Browse ${topic.topic} ${topic.categoryName} Top 3 lists`}>
                  <View
                    style={styles.topicIcon}>
                    <Text
                      style={styles.topicEmoji}>
                      {topic.categoryIcon}
                    </Text>
                  </View>

                  <View
                    style={styles.topicDetails}>
                    <Text
                      style={styles.topicTitle}>
                      {topic.topic}
                    </Text>

                    <Text
                      style={styles.topicMeta}>
                      {topic.categoryName} ·{' '}
                      {getTopicCountLabel(
                        topic.listCount
                      )}
                    </Text>
                  </View>

                  <Text style={styles.arrow}>
                    ›
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  headingSection: {
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#222222',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#222222',
  },

  categoryList: {
    gap: 12,
  },

  categoryCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 28,
  },

  categoryDetails: {
    flex: 1,
    marginLeft: 14,
  },

  categoryName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
  },

  categoryMetaRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  categoryMeta: {
    fontSize: 13,
    color: '#888888',
  },

  categoryMetaLoading: {
    marginLeft: 7,
  },

  topicsSection: {
    marginTop: 30,
  },

  topicList: {
    gap: 12,
  },

  topicCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  topicIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topicEmoji: {
    fontSize: 25,
  },

  topicDetails: {
    flex: 1,
    marginLeft: 14,
  },

  topicTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },

  topicMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#888888',
  },

  topicsLoading: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  topicsLoadingText: {
    marginLeft: 9,
    fontSize: 15,
    color: '#777777',
  },

  emptyTopics: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  emptyTopicsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },

  emptyTopicsText: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },

  arrow: {
    marginLeft: 10,
    fontSize: 30,
    color: '#999999',
  },

  pressed: {
    opacity: 0.68,
  },
});