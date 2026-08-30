import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useTop3 } from '@/context/top3-context';
import { getPublishedPosts } from '@/services/post-service';
import { Post } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
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

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function formatTopicLabel(topic: string) {
  return topic
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(' ');
}

export default function OverallTop3TopicsScreen() {
  const params = useLocalSearchParams<{
    category?: string | string[];
  }>();

  const categoryId = Array.isArray(
    params.category
  )
    ? params.category[0]
    : params.category;

  useTop3();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const category = TOP3_CATEGORIES.find(
    (item) =>
      normalizeValue(item.id) ===
      normalizeValue(categoryId)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);

      try {
        const publishedPosts =
          await getPublishedPosts();

        if (isMounted) {
          setAllPosts(publishedPosts);
        }
      } catch (error) {
        console.error(
          'Failed to load Overall Top 3 topics:',
          error
        );

        if (isMounted) {
          setAllPosts([]);
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
  }, []);

  const topics = useMemo(() => {
    if (!categoryId) {
      return [];
    }

    const normalizedCategory =
      normalizeValue(categoryId);

    const topicMap = new Map<
      string,
      {
        id: string;
        label: string;
        listCount: number;
      }
    >();

    allPosts.forEach((post) => {
      if (
        normalizeValue(
          post.collection.category
        ) !== normalizedCategory
      ) {
        return;
      }

      const rawTopic =
        post.collection.topic?.trim();

      if (!rawTopic) {
        return;
      }

      const normalizedTopic =
        normalizeValue(rawTopic);

      const existing =
        topicMap.get(normalizedTopic);

      if (existing) {
        existing.listCount += 1;
        return;
      }

      topicMap.set(normalizedTopic, {
        id: normalizedTopic,
        label: formatTopicLabel(rawTopic),
        listCount: 1,
      });
    });

    return Array.from(topicMap.values()).sort(
      (first, second) => {
        if (
          second.listCount !== first.listCount
        ) {
          return (
            second.listCount -
            first.listCount
          );
        }

        return first.label.localeCompare(
          second.label
        );
      }
    );
  }, [allPosts, categoryId]);

  function openOverallRanking(
    topic?: string
  ) {
    if (!categoryId) {
      return;
    }

    router.push({
      pathname: '/community-top3',
      params: {
        category: categoryId,
        topic: topic ?? 'general',
      },
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.loadingState}>
          <ActivityIndicator
            size="small"
            color="#222222"
          />

          <Text style={styles.loadingText}>
            Loading topics…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!categoryId || !category) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <Text style={styles.messageTitle}>
            Category unavailable
          </Text>

          <Text style={styles.messageText}>
            This Overall Top 3 category could not
            be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingSection}>
          <Text style={styles.headingIcon}>
            {category.icon}
          </Text>

          <View style={styles.headingDetails}>
            <Text style={styles.title}>
              Overall Top 3 {category.name}
            </Text>

            <Text style={styles.subtitle}>
              Browse the overall ranking or choose
              a topic.
            </Text>
          </View>
        </View>

        <View style={styles.topicList}>
          <Pressable
            style={({ pressed }) => [
              styles.topicCard,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              openOverallRanking()
            }
            accessibilityRole="button"
            accessibilityLabel={`Open overall Top 3 ${category.name}`}>
            <View style={styles.topicIcon}>
              <Ionicons
                name="trophy-outline"
                size={22}
                color="#222222"
              />
            </View>

            <View style={styles.topicDetails}>
              <Text style={styles.topicTitle}>
                Overall
              </Text>

              <Text
                style={styles.topicDescription}>
                The combined Top 3 across all
                published {category.name.toLowerCase()}{' '}
                lists.
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {topics.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Topics
              </Text>

              {topics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={({ pressed }) => [
                    styles.topicCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    openOverallRanking(topic.id)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open overall Top 3 ${topic.label}`}>
                  <View style={styles.topicIcon}>
                    <Ionicons
                      name="albums-outline"
                      size={22}
                      color="#222222"
                    />
                  </View>

                  <View
                    style={styles.topicDetails}>
                    <Text
                      style={styles.topicTitle}>
                      {topic.label}
                    </Text>

                    <Text
                      style={
                        styles.topicDescription
                      }>
                      Based on {topic.listCount}{' '}
                      {topic.listCount === 1
                        ? 'published list'
                        : 'published lists'}
                    </Text>
                  </View>

                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No topics yet
              </Text>

              <Text style={styles.emptyText}>
                Topic rankings will appear here as
                people publish more specific Top 3
                lists.
              </Text>
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
    paddingTop: 22,
    paddingBottom: 40,
  },

  headingSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  headingIcon: {
    marginTop: 2,
    marginRight: 12,
    fontSize: 30,
  },

  headingDetails: {
    flex: 1,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#222222',
  },

  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 7,
    color: COLORS.tertiaryText,
  },

  topicList: {
    gap: 14,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginTop: 8,
    marginBottom: -2,
  },

  topicCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },

  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
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

  topicDescription: {
    ...TYPOGRAPHY.label,
    marginTop: 4,
    fontWeight: '400',
    color: COLORS.tertiaryText,
  },

  arrow: {
    marginLeft: 10,
    fontSize: 30,
    color: '#999999',
  },

  emptyState: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 34,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
  },

  emptyText: {
    ...TYPOGRAPHY.body,
    marginTop: 8,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
  },

  loadingText: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 10,
    color: COLORS.tertiaryText,
  },

  messageState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 24,
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 8,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.68,
  },
});