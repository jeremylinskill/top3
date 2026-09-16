import AppText from '@/components/app-text';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
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
  const colors = useAppColors();
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

  const [
    hasLoadError,
    setHasLoadError,
  ] = useState(false);

  const [loadAttempt, setLoadAttempt] =
    useState(0);

  const category = TOP3_CATEGORIES.find(
    (item) =>
      normalizeValue(item.id) ===
      normalizeValue(categoryId)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setHasLoadError(false);

      try {
        const publishedPosts =
          await getPublishedPosts();

        if (isMounted) {
          setAllPosts(publishedPosts);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load Overall Top 3 topics:',
            error
          );
        }

        if (isMounted) {
          setAllPosts([]);
          setHasLoadError(true);
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
  }, [loadAttempt]);

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
            color={colors.text}
          />

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.loadingText}>
            Loading topics…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (hasLoadError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Couldn’t load topics
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={() =>
              setLoadAttempt(
                (current) => current + 1
              )
            }
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!categoryId || !category) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <ScreenHeader showBackButton />

        <View style={styles.messageState}>
          <AppText
            variant="stateTitle"
            style={styles.messageTitle}>
            Category unavailable
          </AppText>

          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.messageText}>
            This Overall Top 3 category could not
            be found.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingSection}>
          <Text style={styles.headingIcon}>
            {category.icon}
          </Text>

          <View style={styles.headingDetails}>
            <AppText
              variant="rankingTitle"
              style={styles.title}>
              Overall Top 3 {category.name}
            </AppText>

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.subtitle}>
              Browse the overall ranking or choose
              a topic.
            </AppText>
          </View>
        </View>

        <View style={styles.topicList}>
          <Pressable
            style={({ pressed }) => [
              styles.topicCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
            onPress={() =>
              openOverallRanking()
            }
            accessibilityRole="button"
            accessibilityLabel={`Open overall Top 3 ${category.name}`}>
            <View
              style={[
                styles.topicIcon,
                {
                  backgroundColor:
                    colors.secondarySurface,
                },
              ]}>
              <Ionicons
                name="trophy-outline"
                size={22}
                color={colors.text}
              />
            </View>

            <View style={styles.topicDetails}>
              <AppText
                variant="selectionTitle">
                Overall
              </AppText>

              <AppText
                variant="label"
                tone="tertiary"
                emphasis="regular"
                style={styles.topicDescription}>
                The combined Top 3 across all
                published {category.name.toLowerCase()}{' '}
                lists.
              </AppText>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={colors.tertiaryText}
              style={styles.arrow}
            />
          </Pressable>

          {topics.length > 0 ? (
            <>
              <AppText
                variant="sectionTitle"
                style={styles.sectionTitle}>
                Topics
              </AppText>

              {topics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={({ pressed }) => [
                    styles.topicCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    openOverallRanking(topic.id)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open overall Top 3 ${topic.label}`}>
                  <View
                    style={[
                      styles.topicIcon,
                      {
                        backgroundColor:
                          colors.secondarySurface,
                      },
                    ]}>
                    <Ionicons
                      name="albums-outline"
                      size={22}
                      color={colors.text}
                    />
                  </View>

                  <View
                    style={styles.topicDetails}>
                    <AppText
                      variant="selectionTitle">
                      {topic.label}
                    </AppText>

                    <AppText
                      variant="label"
                      tone="tertiary"
                      emphasis="regular"
                      style={styles.topicDescription}>
                      Based on {topic.listCount}{' '}
                      {topic.listCount === 1
                        ? 'published list'
                        : 'published lists'}
                    </AppText>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={colors.tertiaryText}
                    style={styles.arrow}
                  />
                </Pressable>
              ))}
            </>
          ) : (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <AppText
                variant="emptyStateTitle"
                style={styles.emptyTitle}>
                No topics yet
              </AppText>

              <AppText
                variant="body"
                tone="tertiary"
                style={styles.emptyText}>
                Topic rankings will appear here as
                people publish more specific Top 3
                lists.
              </AppText>
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

  title: {},

  subtitle: {
    marginTop: 7,
  },

  topicList: {
    gap: 14,
  },

  sectionTitle: {
    marginTop: 8,
    marginBottom: -2,
  },

  topicCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },

  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topicDetails: {
    flex: 1,
    marginLeft: 14,
  },

  topicDescription: {
    marginTop: 4,
  },

  arrow: {
    marginLeft: 10,
  },

  emptyState: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 34,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 18,
  },

  emptyTitle: {},

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
  },

  loadingText: {
    marginTop: 10,
  },

  messageState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 24,
  },

  messageTitle: {
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.68,
  },
});