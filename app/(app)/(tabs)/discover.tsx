import AppText from '@/components/app-text';
import DiscoverListCard from '@/components/discover-list-card';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import SegmentedControl from '@/components/segmented-control';
import TasteMatchBadge from '@/components/taste-match-badge';
import UserAvatar from '@/components/user-avatar';
import {
  FEATURED_DISCOVER_CATEGORY_IDS,
  FEATURED_DISCOVER_TOPICS,
  MIN_TRENDING_CATEGORIES,
  MIN_TRENDING_TOPICS,
} from '@/constants/discover-featured';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useBlock } from '@/context/block-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  getNewestPublicProfiles,
  getPublicProfilesByIds,
  searchPublicProfiles,
} from '@/lib/supabase/profiles';
import { getPublishedPosts } from '@/services/post-service';
import {
  clearRecentSearches,
  getRecentSearches,
  saveRecentSearch,
} from '@/services/recent-search-service';
import { getTasteRecommendations } from '@/services/taste-recommendation-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import {
  Ionicons,
  MaterialIcons,
} from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
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

type DiscoverTopic = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  topic: string;
  listCount: number;
};

type MatchingCollection = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  topic: string;
  title: string;
  matchingListCount: number;
};

type DiscoverBrowseMode = 'people' | 'trending';

const TRENDING_WINDOW_DAYS = 30;
const MAX_TRENDING_CATEGORIES = 3;
const MAX_TRENDING_TOPICS = 3;

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

function formatResultCaption(
  categoryCount: number,
  topicCount: number,
  collectionCount: number,
  peopleCount: number
) {
  const total =
    categoryCount +
    topicCount +
    collectionCount +
    peopleCount;

  if (total === 0) {
    return 'No matches';
  }

  if (total === 1) {
    return '1 match';
  }

  return `${total} matches`;
}

export default function DiscoverScreen() {
  const colors = useAppColors();
  const { profile } = useProfile();
  const { createList } = useTop3();

  const {
    blockedUserIds,
  } = useBlock();

  const {
    followedUserIds,
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const [allPosts, setAllPosts] = useState<
    Post[]
  >([]);

  const [
  profilesByUserId,
  setProfilesByUserId,
] = useState<Record<string, UserProfile>>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    hasDiscoverLoadError,
    setHasDiscoverLoadError,
  ] = useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [profileSearchResults, setProfileSearchResults] =
    useState<UserProfile[]>([]);

  const [newestProfiles, setNewestProfiles] =
    useState<UserProfile[]>([]);

  const [recentSearches, setRecentSearches] =
    useState<string[]>([]);

  const [isSearchFocused, setIsSearchFocused] =
    useState(false);

  const [browseMode, setBrowseMode] =
    useState<DiscoverBrowseMode>('people');

  useEffect(() => {
    let isMounted = true;

    async function loadRecentSearches() {
      const storedSearches =
        await getRecentSearches(profile.id);

      if (isMounted) {
        setRecentSearches(storedSearches);
      }
    }

    loadRecentSearches();

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  const loadPosts = useCallback(async () => {
    const publishedPosts =
      await getPublishedPosts();

    const authorIds = Array.from(
      new Set(
        publishedPosts.map(
          (post) => post.authorId
        )
      )
    );

    const authors =
      await getPublicProfilesByIds(authorIds);

    const nextProfilesByUserId =
      Object.fromEntries(
        authors.map((author) => [
          author.id,
          author,
        ])
      );

    setAllPosts(publishedPosts);
    setProfilesByUserId(nextProfilesByUserId);
  }, []);

  const loadNewestProfiles =
    useCallback(async () => {
      const profiles =
        await getNewestPublicProfiles(
          profile.id,
          8
        );

      setNewestProfiles(profiles);
    }, [profile.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadDiscover() {
      setIsLoading(true);
      setHasDiscoverLoadError(false);

      try {
        const publishedPosts =
          await getPublishedPosts();

        const authorIds = Array.from(
          new Set(
            publishedPosts.map(
              (post) => post.authorId
            )
          )
        );

        const authors =
          await getPublicProfilesByIds(authorIds);

        const nextProfilesByUserId =
          Object.fromEntries(
            authors.map((author) => [
              author.id,
              author,
            ])
          );

        if (isMounted) {
          setAllPosts(publishedPosts);
          setProfilesByUserId(
            nextProfilesByUserId
          );
          setHasDiscoverLoadError(false);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load Discover content:',
            error
          );
        }

        if (isMounted) {
          setAllPosts([]);
          setHasDiscoverLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDiscover();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNewestProfiles() {
      try {
        const profiles =
          await getNewestPublicProfiles(
            profile.id,
            8
          );

        if (isMounted) {
          setNewestProfiles(profiles);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load newest public profiles:',
            error
          );
        }

        if (isMounted) {
          setNewestProfiles([]);
        }
      }
    }

    void loadInitialNewestProfiles();

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  const refreshDiscover = useCallback(
    async () => {
      setIsRefreshing(true);

      try {
        const results = await Promise.allSettled([
          loadPosts(),
          loadNewestProfiles(),
        ]);

        const postsResult = results[0];
        const profilesResult = results[1];

        if (postsResult.status === 'rejected') {
          if (__DEV__) {
            console.log(
              'Failed to refresh Discover content:',
              postsResult.reason
            );
          }
        } else {
          setHasDiscoverLoadError(false);
        }

        if (profilesResult.status === 'rejected') {
          if (__DEV__) {
            console.log(
              'Failed to refresh newest public profiles:',
              profilesResult.reason
            );
          }
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [loadNewestProfiles, loadPosts]
  );

  const retryDiscover = useCallback(async () => {
    setIsLoading(true);

    try {
      const results = await Promise.allSettled([
        loadPosts(),
        loadNewestProfiles(),
      ]);

      const postsResult = results[0];
      const profilesResult = results[1];

      if (postsResult.status === 'rejected') {
        if (__DEV__) {
          console.log(
            'Failed to retry Discover content:',
            postsResult.reason
          );
        }
        setHasDiscoverLoadError(true);
      } else {
        setHasDiscoverLoadError(false);
      }

      if (profilesResult.status === 'rejected') {
        if (__DEV__) {
          console.log(
            'Failed to retry newest public profiles:',
            profilesResult.reason
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadNewestProfiles, loadPosts]);

  const visiblePosts = useMemo(
    () =>
      allPosts.filter(
        (post) =>
          !blockedUserIds.includes(post.authorId)
      ),
    [allPosts, blockedUserIds]
  );

  const visibleNewestProfiles = useMemo(
    () =>
      newestProfiles.filter(
        (candidateProfile) =>
          !blockedUserIds.includes(
            candidateProfile.id
          )
      ),
    [blockedUserIds, newestProfiles]
  );

  const publishedCountByCategory = useMemo(
    () => {
      const counts = new Map<string, number>();

      visiblePosts.forEach((post) => {
        const categoryId = normalizeValue(
          post.collection.category
        );

        const postTopic =
          normalizeValue(
            post.collection.topic
          ) || 'general';

        if (
          !categoryId ||
          postTopic !== 'general'
        ) {
          return;
        }

        counts.set(
          categoryId,
          (counts.get(categoryId) ?? 0) + 1
        );
      });

      return counts;
    },
    [visiblePosts]
  );

  const allTopics = useMemo<
    DiscoverTopic[]
  >(() => {
    const topicMap = new Map<
      string,
      DiscoverTopic
    >();

    visiblePosts.forEach((post) => {
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
        `${categoryId}:${normalizedTopic}`;

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
      }
    );
  }, [visiblePosts]);

  const trendingPosts = useMemo(() => {
    const cutoffTime =
      Date.now() -
      TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const recentPosts = visiblePosts.filter((post) => {
      const publishedTime = new Date(
        post.publishedAt
      ).getTime();

      return (
        Number.isFinite(publishedTime) &&
        publishedTime >= cutoffTime
      );
    });

    return recentPosts.length > 0
      ? recentPosts
      : visiblePosts;
  }, [visiblePosts]);

  const trendingCategories = useMemo(() => {
    const counts = new Map<string, number>();

    trendingPosts.forEach((post) => {
      const categoryId = normalizeValue(
        post.collection.category
      );

      const postTopic =
        normalizeValue(post.collection.topic) ||
        'general';

      if (!categoryId || postTopic !== 'general') {
        return;
      }

      counts.set(
        categoryId,
        (counts.get(categoryId) ?? 0) + 1
      );
    });

    return DISCOVER_CATEGORIES
      .map((category) => ({
        ...category,
        trendingCount:
          counts.get(normalizeValue(category.id)) ?? 0,
      }))
      .filter((category) => category.trendingCount > 0)
      .sort((first, second) => {
        if (
          second.trendingCount !== first.trendingCount
        ) {
          return (
            second.trendingCount -
            first.trendingCount
          );
        }

        return first.name.localeCompare(second.name);
      })
      .slice(0, MAX_TRENDING_CATEGORIES);
  }, [trendingPosts]);

  const trendingTopics = useMemo<
    DiscoverTopic[]
  >(() => {
    const topicMap = new Map<
      string,
      DiscoverTopic
    >();

    trendingPosts.forEach((post) => {
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

      const category = TOP3_CATEGORIES.find(
        (item) =>
          normalizeValue(item.id) === categoryId
      );

      if (!category) {
        return;
      }

      const topicId =
        `${categoryId}:${normalizedTopic}`;
      const existingTopic = topicMap.get(topicId);

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
            second.listCount - first.listCount
          );
        }

        const topicComparison =
          first.topic.localeCompare(second.topic);

        if (topicComparison !== 0) {
          return topicComparison;
        }

        return first.categoryName.localeCompare(
          second.categoryName
        );
      })
      .slice(0, MAX_TRENDING_TOPICS);
  }, [trendingPosts]);

  const featuredTopics = useMemo<
    DiscoverTopic[]
  >(() => {
    return FEATURED_DISCOVER_TOPICS.flatMap(
      (featuredTopic) => {
        const category =
          DISCOVER_CATEGORIES.find(
            (item) =>
              normalizeValue(item.id) ===
              normalizeValue(
                featuredTopic.categoryId
              )
          );

        if (!category) {
          return [];
        }

        const existingTopic = allTopics.find(
          (topic) =>
            normalizeValue(topic.categoryId) ===
              normalizeValue(
                featuredTopic.categoryId
              ) &&
            normalizeValue(topic.topic) ===
              normalizeValue(
                featuredTopic.topic
              )
        );

        return [
          {
            id: `featured:${category.id}:${normalizeValue(
              featuredTopic.topic
            )}`,
            categoryId: category.id,
            categoryName: category.name,
            categoryIcon: category.icon,
            topic: formatTopicLabel(
              featuredTopic.topic
            ),
            listCount:
              existingTopic?.listCount ?? 0,
          },
        ];
      }
    );
  }, [allTopics]);

  const featuredCategories = useMemo(
    () =>
      FEATURED_DISCOVER_CATEGORY_IDS.flatMap(
        (categoryId) => {
          const category =
            DISCOVER_CATEGORIES.find(
              (item) =>
                normalizeValue(item.id) ===
                normalizeValue(categoryId)
            );

          return category ? [category] : [];
        }
      ),
    []
  );

  const showTrendingTopics =
    trendingTopics.length >=
    MIN_TRENDING_TOPICS;

  const showTrendingCategories =
    trendingCategories.length >=
    MIN_TRENDING_CATEGORIES;

  const hasMixedTrendingState =
    showTrendingCategories !==
    showTrendingTopics;

  const displayedTopics =
    showTrendingTopics
      ? trendingTopics
      : featuredTopics;

  const displayedCategories =
    showTrendingCategories
      ? trendingCategories
      : featuredCategories;

  const tasteRecommendations = useMemo(() => {
    const publishedPostCountByUserId =
      new Map<string, number>();

    visiblePosts.forEach((post) => {
      publishedPostCountByUserId.set(
        post.authorId,
        (publishedPostCountByUserId.get(
          post.authorId
        ) ?? 0) + 1
      );
    });

    const recommendationCandidates =
      getTasteRecommendations({
  posts: visiblePosts,
  profilesByUserId,
  currentUserId: profile.id,
  limit: 5,
});

    return recommendationCandidates
      .filter(
        ({ user }) =>
          user.id !== profile.id &&
          !followedUserIds.includes(user.id) &&
          !blockedUserIds.includes(user.id)
      )
      .sort((first, second) => {
        if (second.score !== first.score) {
          return second.score - first.score;
        }

        if (
          second.sharedPickCount !==
          first.sharedPickCount
        ) {
          return (
            second.sharedPickCount -
            first.sharedPickCount
          );
        }

        const secondPublishedCount =
          publishedPostCountByUserId.get(
            second.user.id
          ) ?? 0;

        const firstPublishedCount =
          publishedPostCountByUserId.get(
            first.user.id
          ) ?? 0;

        if (
          secondPublishedCount !==
          firstPublishedCount
        ) {
          return (
            secondPublishedCount -
            firstPublishedCount
          );
        }

        return first.user.displayName.localeCompare(
          second.user.displayName
        );
      })
      .slice(0, 3);
  }, [
    visiblePosts,
    profilesByUserId,
    followedUserIds,
    blockedUserIds,
    profile.id,
  ]);

  const activeCollectors = useMemo(() => {
    const publishedCountByUserId =
      new Map<string, number>();

    visiblePosts.forEach((post) => {
      publishedCountByUserId.set(
        post.authorId,
        (publishedCountByUserId.get(
          post.authorId
        ) ?? 0) + 1
      );
    });

    return Array.from(
      publishedCountByUserId.entries()
    )
      .map(([userId, collectionCount]) => {
        const user = profilesByUserId[userId];

        if (
          !user ||
          user.id === profile.id ||
          blockedUserIds.includes(user.id)
        ) {
          return null;
        }

        return {
          user,
          collectionCount,
        };
      })
      .filter(
        (
          collector
        ): collector is {
          user: UserProfile;
          collectionCount: number;
        } => collector !== null
      )
      .sort((first, second) => {
        if (
          second.collectionCount !==
          first.collectionCount
        ) {
          return (
            second.collectionCount -
            first.collectionCount
          );
        }

        return first.user.displayName.localeCompare(
          second.user.displayName
        );
      });
  }, [
    visiblePosts,
    profilesByUserId,
    blockedUserIds,
    profile.id,
  ]);

  const discoverMorePeople = useMemo(() => {
    const excludedUserIds = new Set([
      profile.id,
      ...followedUserIds,
      ...blockedUserIds,
      ...tasteRecommendations.map(
        ({ user }) => user.id
      ),
    ]);

    const people: Array<{
      user: UserProfile;
      detail: string;
    }> = [];

    activeCollectors.forEach(
      ({ user, collectionCount }) => {
        if (
          people.length >= 3 ||
          excludedUserIds.has(user.id)
        ) {
          return;
        }

        excludedUserIds.add(user.id);

        people.push({
          user,
          detail:
            collectionCount === 1
              ? '1 published Top 3'
              : `${collectionCount} published Top 3s`,
        });
      }
    );

    visibleNewestProfiles.forEach((user) => {
      if (
        people.length >= 3 ||
        excludedUserIds.has(user.id)
      ) {
        return;
      }

      excludedUserIds.add(user.id);

      people.push({
        user,
        detail: 'New to Top 3',
      });
    });

    return people;
  }, [
    activeCollectors,
    blockedUserIds,
    followedUserIds,
    profile.id,
    tasteRecommendations,
    visibleNewestProfiles,
  ]);

  const normalizedSearchQuery =
    normalizeValue(searchQuery);

  useEffect(() => {
    let isMounted = true;

    if (!normalizedSearchQuery) {
      setProfileSearchResults([]);
      return () => {
        isMounted = false;
      };
    }

    const searchDelay = setTimeout(() => {
      async function loadProfileSearchResults() {
        try {
          const matchingProfiles =
            await searchPublicProfiles(
              normalizedSearchQuery,
              profile.id
            );

          if (isMounted) {
            setProfileSearchResults(
              matchingProfiles
            );
          }
        } catch (error) {
          if (__DEV__) {
            console.log(
              'Failed to search public profiles:',
              error
            );
          }

          if (isMounted) {
            setProfileSearchResults([]);
          }
        }
      }

      void loadProfileSearchResults();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(searchDelay);
    };
  }, [
    normalizedSearchQuery,
    profile.id,
  ]);

  const isSearching =
    normalizedSearchQuery.length > 0;

  const showRecentSearches =
    isSearchFocused &&
    !isSearching &&
    recentSearches.length > 0;

  const filteredCategories = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    return DISCOVER_CATEGORIES.filter(
      (category) =>
        normalizeValue(category.name).includes(
          normalizedSearchQuery
        )
    );
  }, [normalizedSearchQuery]);

  const filteredTopics = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    return allTopics.filter((topic) => {
      const searchableText = normalizeValue(
        `${topic.topic} ${topic.categoryName}`
      );

      return searchableText.includes(
        normalizedSearchQuery
      );
    });
  }, [
    allTopics,
    normalizedSearchQuery,
  ]);

  const matchingCollections = useMemo<
    MatchingCollection[]
  >(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    const collectionMap = new Map<
      string,
      MatchingCollection
    >();

    visiblePosts.forEach((post) => {
      const collectionTitleMatches =
        normalizeValue(
          post.collection.title
        ).includes(
          normalizedSearchQuery
        );

      const itemMatches =
        post.collection.items.some((item) => {
          if (!item) {
            return false;
          }

          const searchableItem =
            normalizeValue(
              `${item.title} ${
                item.subtitle ?? ''
              }`
            );

          return searchableItem.includes(
            normalizedSearchQuery
          );
        });

      if (
        !collectionTitleMatches &&
        !itemMatches
      ) {
        return;
      }

      const categoryId = normalizeValue(
        post.collection.category
      );

      if (!categoryId) {
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

      const normalizedTopic =
        normalizeValue(
          post.collection.topic
        ) || 'general';

      const collectionId =
        `${categoryId}:${normalizedTopic}`;

      const existingCollection =
        collectionMap.get(collectionId);

      if (existingCollection) {
        existingCollection.matchingListCount += 1;
        return;
      }

      collectionMap.set(collectionId, {
        id: collectionId,
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        topic: normalizedTopic,
        title: post.collection.title,
        matchingListCount: 1,
      });
    });

    return Array.from(
      collectionMap.values()
    ).sort((first, second) => {
      if (
        second.matchingListCount !==
        first.matchingListCount
      ) {
        return (
          second.matchingListCount -
          first.matchingListCount
        );
      }

      return first.title.localeCompare(
        second.title
      );
    });
  }, [
    visiblePosts,
    normalizedSearchQuery,
  ]);

  const filteredPeople = useMemo(
    () =>
      profileSearchResults.filter(
        (candidateProfile) =>
          !blockedUserIds.includes(
            candidateProfile.id
          )
      ),
    [
      blockedUserIds,
      profileSearchResults,
    ]
  );

  const displayedMatchingCollections =
    filteredCategories.length === 0 &&
    filteredTopics.length === 0
      ? matchingCollections
      : [];

  const resultCount =
    filteredCategories.length +
    filteredTopics.length +
    displayedMatchingCollections.length +
    filteredPeople.length;

  const resultCaption = formatResultCaption(
    filteredCategories.length,
    filteredTopics.length,
    displayedMatchingCollections.length,
    filteredPeople.length
  );

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

  function getMatchingListCountLabel(
    count: number
  ) {
    if (count === 1) {
      return '1 matching list';
    }

    return `${count} matching lists`;
  }

  async function rememberSearch(
    value: string
  ) {
    const normalizedSearch = value.trim();

    if (!normalizedSearch) {
      return;
    }

    const nextSearches =
      await saveRecentSearch(
  profile.id,
  normalizedSearch
);

    setRecentSearches(nextSearches);
  }

  function submitSearch() {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearchFocused(false);
    Keyboard.dismiss();
    void rememberSearch(searchQuery);
  }

  function chooseRecentSearch(
    recentSearch: string
  ) {
    setSearchQuery(recentSearch);
    setIsSearchFocused(false);
    Keyboard.dismiss();
    void rememberSearch(recentSearch);
  }

  async function removeRecentSearch(
    recentSearchToRemove: string
  ) {
    const nextSearches = recentSearches.filter(
      (recentSearch) =>
        normalizeValue(recentSearch) !==
        normalizeValue(recentSearchToRemove)
    );

    await clearRecentSearches(
  profile.id
);

    for (const recentSearch of [
      ...nextSearches,
    ].reverse()) {
      await saveRecentSearch(
  profile.id,
  recentSearch
);
    }

    setRecentSearches(nextSearches);
  }

  function dismissSearchKeyboard() {
    setIsSearchFocused(false);
    Keyboard.dismiss();
  }

  async function clearAllRecentSearches() {
   await clearRecentSearches(profile.id);
    setRecentSearches([]);
  }

  function clearSearch() {
    setSearchQuery('');
    Keyboard.dismiss();
  }

  function saveActiveSearch() {
    if (isSearching) {
      void rememberSearch(searchQuery);
    }
  }

  function openCategoryFeed(
    categoryId: string
  ) {
    Keyboard.dismiss();
    saveActiveSearch();

    router.push({
      pathname: '/category-feed',
      params: {
        category: categoryId,
        topic: 'general',
      },
    });
  }

  function openTopicFeed(
    topic: DiscoverTopic
  ) {
    Keyboard.dismiss();
    saveActiveSearch();

    router.push({
      pathname: '/category-feed',
      params: {
        category: topic.categoryId,
        topic: normalizeValue(topic.topic),
      },
    });
  }

  function openCreateForCategory(
    categoryId: string
  ) {
    const category = TOP3_CATEGORIES.find(
      (item) =>
        normalizeValue(item.id) ===
        normalizeValue(categoryId)
    );

    if (!category) {
      return;
    }

    Keyboard.dismiss();

    createList({
      category: category.id,
      title: `Top 3 ${category.name}`,
    });

    router.push('/collection');
  }

  function openCreateForTopic(
    topic: DiscoverTopic
  ) {
    const category = TOP3_CATEGORIES.find(
      (item) =>
        normalizeValue(item.id) ===
        normalizeValue(topic.categoryId)
    );

    const topicDefinition =
      category?.topics.find(
        (item) =>
          normalizeValue(item.name) ===
          normalizeValue(topic.topic)
      );

    if (!category || !topicDefinition) {
      return;
    }

    const topicName =
      topicDefinition.id === 'general'
        ? undefined
        : topicDefinition.name;

    const title =
      topicDefinition.id === 'general'
        ? `Top 3 ${category.name}`
        : `Top 3 ${topicDefinition.name} ${category.name}`;

    Keyboard.dismiss();

    createList({
      category: category.id,
      topic: topicName,
      title,
    });

    router.push('/collection');
  }

  function openDisplayedTopic(
    topic: DiscoverTopic
  ) {
    if (
      !showTrendingTopics &&
      topic.listCount === 0
    ) {
      openCreateForTopic(topic);
      return;
    }

    openTopicFeed(topic);
  }

  function openDisplayedCategory(
    categoryId: string
  ) {
    if (
      !showTrendingCategories &&
      getPublishedCount(categoryId) === 0
    ) {
      openCreateForCategory(categoryId);
      return;
    }

    openCategoryFeed(categoryId);
  }

  function openMatchingCollection(
    collection: MatchingCollection
  ) {
    Keyboard.dismiss();
    saveActiveSearch();

    router.push({
      pathname: '/category-feed',
      params: {
        category: collection.categoryId,
        topic: collection.topic,
        itemQuery: searchQuery.trim(),
      },
    });
  }

  function openPersonProfile(
    person: UserProfile
  ) {
    Keyboard.dismiss();
    saveActiveSearch();

    router.push({
      pathname: '/public-profile',
      params: {
        userId: person.id,
      },
    });
  }

  function openTasteMatch(userId: string) {
    Keyboard.dismiss();
    saveActiveSearch();

    router.push({
      pathname: '/taste-match',
      params: {
        userId,
      },
    });
  }

  function toggleRecommendedPersonFollow(
    userId: string
  ) {
    if (isLoadingFollowState) {
      return;
    }

    toggleFollow(userId);
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
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshDiscover}
            tintColor={colors.secondaryText}
            colors={[colors.secondaryText]}
          />
        }
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
        onScrollBeginDrag={dismissSearchKeyboard}>
        <View style={styles.headingSection}>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search People and Lists"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={submitSearch}
            accessibilityLabel="Search People and Lists"
            onClear={clearSearch}
          />

          {!showRecentSearches &&
          !isSearching &&
          !hasDiscoverLoadError ? (
            <View style={styles.segmentedSection}>
              <SegmentedControl<DiscoverBrowseMode>
                value={browseMode}
                options={[
                  {
                    value: 'people',
                    label: 'People',
                    accessibilityLabel:
                      'Show people recommendations',
                  },
                  {
                    value: 'trending',
                    label: 'Lists',
                    accessibilityLabel:
                      'Show trending categories and topics',
                  },
                ]}
                onChange={setBrowseMode}
              />
            </View>
          ) : null}
        </View>

        <Pressable
          style={styles.contentDismissArea}
          onPress={dismissSearchKeyboard}
          accessible={false}>
          {hasDiscoverLoadError ? (
            <View
              style={[
                styles.searchPlaceholder,
                {
                  backgroundColor: colors.surface,
                },
              ]}>
              <AppText
                variant="selectionTitle"
                style={styles.searchPlaceholderTitle}>
                Couldn&apos;t load Discover
              </AppText>

              <AppText
                variant="body"
                tone="tertiary"
                style={styles.searchPlaceholderText}>
                Check your connection and try again.
              </AppText>

              <PrimaryButton
                title="Try Again"
                onPress={() => {
                  void retryDiscover();
                }}
                disabled={isLoading}
                style={styles.errorAction}
              />
            </View>
          ) : showRecentSearches ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <AppText
                variant="sectionTitle"
                style={styles.sectionTitle}>
                Recent Searches
              </AppText>

              <Pressable
                style={({ pressed }) => [
                  styles.clearRecentButton,
                  pressed && styles.pressed,
                ]}
                onPress={clearAllRecentSearches}
                accessibilityRole="button"
                accessibilityLabel="Clear recent searches">
                <AppText
                  variant="label"
                  tone="tertiary">
                  Clear all
                </AppText>
              </Pressable>
            </View>

            <View style={styles.recentList}>
              {recentSearches.map(
                (recentSearch) => (
                  <View
                    key={recentSearch.toLowerCase()}
                    style={[
                      styles.recentSearchCard,
                      {
                        backgroundColor: colors.surface,
                      },
                    ]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.recentSearchAction,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        chooseRecentSearch(
                          recentSearch
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Search for ${recentSearch}`}>
                      <MaterialIcons
                        name="history"
                        size={23}
                        color={colors.tertiaryText}
                      />

                      <AppText
                        variant="bodyLarge"
                        numberOfLines={1}
                        style={styles.recentSearchText}>
                        {recentSearch}
                      </AppText>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.removeRecentButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        void removeRecentSearch(
                          recentSearch
                        )
                      }
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${recentSearch} from recent searches`}>
                      <Ionicons
                        name="close"
                        size={21}
                        color={colors.tertiaryText}
                      />
                    </Pressable>
                  </View>
                )
              )}
            </View>
          </View>
        ) : isSearching ? (
          <View style={styles.searchResults}>
            <AppText
              variant="label"
              tone="tertiary"
              emphasis="regular"
              style={styles.resultsCaption}>
              {resultCaption} for “
              {searchQuery.trim()}”
            </AppText>

            {filteredCategories.length > 0 ? (
              <View style={styles.resultSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  Categories
                </AppText>

                <View style={styles.categoryList}>
                  {filteredCategories.map(
                    (category) => (
                      <DiscoverListCard
                        key={category.id}
                        icon={category.icon}
                        title={`All ${category.name}`}
                        metadata={getPublishedCountLabel(
                          category.id
                        )}
                        onPress={() =>
                          openCategoryFeed(
                            category.id
                          )
                        }
                        accessibilityLabel={`Browse All ${category.name} Top 3 lists`}
                      />
                    )
                  )}
                </View>
              </View>
            ) : null}

            {filteredTopics.length > 0 ? (
              <View style={styles.resultSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  Genres
                </AppText>

                <View style={styles.topicList}>
                  {filteredTopics.map(
                    (topic) => (
                      <DiscoverListCard
                        key={topic.id}
                        icon={topic.categoryIcon}
                        title={`${topic.categoryName} • ${topic.topic}`}
                        metadata={getTopicCountLabel(
                          topic.listCount
                        )}
                        onPress={() =>
                          openTopicFeed(topic)
                        }
                        accessibilityLabel={`Browse ${topic.categoryName} ${topic.topic} Top 3 lists`}
                      />
                    )
                  )}
                </View>
              </View>
            ) : null}

            {displayedMatchingCollections.length > 0 ? (
              <View style={styles.resultSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  Lists containing “
                  {searchQuery.trim()}”
                </AppText>

                <View
                  style={styles.collectionList}>
                  {displayedMatchingCollections.map(
                    (collection) => (
                      <Pressable
                        key={collection.id}
                        style={({ pressed }) => [
                          styles.collectionCard,
                          pressed &&
                            styles.pressed,
                        ]}
                        onPress={() =>
                          openMatchingCollection(
                            collection
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${
                          collection.topic === 'general'
                            ? collection.categoryName
                            : `${collection.categoryName} ${formatTopicLabel(
                                collection.topic
                              )}`
                        }`}>
                        <View
                          style={[
                            styles.collectionIcon,
                            {
                              backgroundColor:
                                colors.secondarySurface,
                            },
                          ]}>
                          <Text
                            style={
                              styles.collectionEmoji
                            }>
                            {
                              collection.categoryIcon
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.collectionDetails
                          }>
                          <AppText
                            variant="selectionTitle"
                            style={styles.collectionTitle}
                            numberOfLines={2}>
                            {collection.topic ===
                            'general'
                              ? collection.categoryName
                              : `${collection.categoryName} • ${formatTopicLabel(
                                  collection.topic
                                )}`}
                          </AppText>

                          <AppText
                            variant="metadata"
                            tone="secondary"
                            style={styles.collectionMeta}>
                            {getMatchingListCountLabel(
                              collection.matchingListCount
                            )}
                          </AppText>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={22}
                          color={colors.tertiaryText}
                          style={styles.arrow}
                        />
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            ) : null}

            {filteredPeople.length > 0 ? (
              <View style={styles.resultSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  People
                </AppText>

                <View style={styles.peopleList}>
                  {filteredPeople.map(
                    (person) => (
                      <Pressable
                        key={person.id}
                        style={({ pressed }) => [
                          styles.personCard,
                          pressed &&
                            styles.pressed,
                        ]}
                        onPress={() =>
                          openPersonProfile(person)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${person.displayName}'s profile`}>
                        <UserAvatar
                          displayName={person.displayName}
                          avatarUrl={person.avatarUrl}
                          size={50}
                          fontSize={20}
                        />

                        <View
                          style={
                            styles.personDetails
                          }>
                          <AppText
                            variant="selectionTitle">
                            {person.displayName}
                          </AppText>

                          <AppText
                            variant="subtitle"
                            tone="tertiary"
                            style={styles.personUsername}>
                            @{person.username}
                          </AppText>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={22}
                          color={colors.tertiaryText}
                          style={styles.arrow}
                        />
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            ) : null}

            {resultCount === 0 ? (
              <View
                style={[
                  styles.searchPlaceholder,
                  {
                    backgroundColor: colors.surface,
                  },
                ]}>
                <AppText
                  variant="selectionTitle"
                  style={styles.searchPlaceholderTitle}>
                  No results found
                </AppText>

                <AppText
                  variant="body"
                  tone="tertiary"
                  style={styles.searchPlaceholderText}>
                  Try searching for another
                  category, genre, ranked item, or
                  person.
                </AppText>
              </View>
            ) : null}
          </View>
        ) : (
          browseMode === 'people' ? (
            <>
            {tasteRecommendations.length > 0 ? (
              <View style={styles.tasteSection}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  People with Similar Taste
                </AppText>

                <View style={styles.tasteList}>
                  {tasteRecommendations.map(
                    ({
                      user,
                      score,
                      sharedPickCount,
                    }) => {
                      const userIsFollowed =
                        isFollowing(user.id);

                      return (
                        <View
                          key={user.id}
                          style={[
                            styles.tasteCard,
                            {
                              backgroundColor: colors.surface,
                            },
                          ]}>
                          <View style={styles.tasteMainContent}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.tasteProfileAction,
                                pressed && styles.pressed,
                              ]}
                              onPress={() =>
                                openPersonProfile(user)
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${user.displayName}'s profile`}>
                              <UserAvatar
                                displayName={user.displayName}
                                avatarUrl={user.avatarUrl}
                                size={50}
                                fontSize={20}
                              />

                              <View
                                style={styles.tasteDetails}>
                                <AppText
                                  variant="selectionTitle"
                                  numberOfLines={1}>
                                  {user.displayName}
                                </AppText>

                                <AppText
                                  variant="subtitle"
                                  tone="tertiary"
                                  style={styles.personUsername}
                                  numberOfLines={1}>
                                  @{user.username}
                                </AppText>
                              </View>
                            </Pressable>

                            <View style={styles.tasteBadgeRow}>
                              <TasteMatchBadge
                                score={score}
                                sharedPickCount={
                                  sharedPickCount
                                }
                                onPress={() =>
                                  openTasteMatch(user.id)
                                }
                              />
                            </View>
                          </View>

                          <Pressable
                            style={({ pressed }) => [
                              styles.tasteFollowButton,
                              userIsFollowed
                                ? {
                                    backgroundColor:
                                      colors.surface,
                                    borderColor:
                                      colors.border,
                                  }
                                : {
                                    backgroundColor:
                                      colors.primary,
                                  },
                              userIsFollowed &&
                                styles
                                  .tasteFollowingButton,
                              pressed && styles.pressed,
                              isLoadingFollowState &&
                                styles.disabled,
                            ]}
                            onPress={() =>
                              toggleRecommendedPersonFollow(
                                user.id
                              )
                            }
                            disabled={isLoadingFollowState}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: userIsFollowed,
                              disabled:
                                isLoadingFollowState,
                            }}
                            accessibilityLabel={
                              userIsFollowed
                                ? `Unfollow ${user.displayName}`
                                : `Follow ${user.displayName}`
                            }>
                            <AppText
                              variant="label"
                              tone={
                                userIsFollowed
                                  ? 'primary'
                                  : 'onPrimary'
                              }
                              emphasis="strong">
                              {userIsFollowed
                                ? 'Following'
                                : 'Follow'}
                            </AppText>
                          </Pressable>
                        </View>
                      );
                    }
                  )}
                </View>
              </View>
            ) : null}

            {discoverMorePeople.length > 0 ? (
              <View
                style={[
                  styles.tasteSection,
                  tasteRecommendations.length > 0 &&
                    styles.discoverMoreSection,
                ]}>
                <AppText
                  variant="sectionTitle"
                  style={styles.sectionTitle}>
                  Discover More People
                </AppText>

                <View style={styles.tasteList}>
                  {discoverMorePeople.map(
                    ({ user, detail }) => {
                      const userIsFollowed =
                        isFollowing(user.id);

                      return (
                        <View
                          key={user.id}
                          style={[
                            styles.tasteCard,
                            {
                              backgroundColor: colors.surface,
                            },
                          ]}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.tasteProfileAction,
                              styles.newMemberProfileAction,
                              pressed && styles.pressed,
                            ]}
                            onPress={() =>
                              openPersonProfile(user)
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${user.displayName}'s profile`}>
                            <UserAvatar
                              displayName={user.displayName}
                              avatarUrl={user.avatarUrl}
                              size={50}
                              fontSize={20}
                            />

                            <View
                              style={styles.tasteDetails}>
                              <AppText
                                variant="selectionTitle"
                                numberOfLines={1}>
                                {user.displayName}
                              </AppText>

                              <AppText
                                variant="subtitle"
                                tone="tertiary"
                                style={styles.personUsername}
                                numberOfLines={1}>
                                @{user.username}
                              </AppText>

                              <AppText
                                variant="metadata"
                                tone="secondary"
                                style={styles.discoverPersonMeta}
                                numberOfLines={1}>
                                {detail}
                              </AppText>
                            </View>
                          </Pressable>

                          <Pressable
                            style={({ pressed }) => [
                              styles.tasteFollowButton,
                              userIsFollowed
                                ? {
                                    backgroundColor:
                                      colors.surface,
                                    borderColor:
                                      colors.border,
                                  }
                                : {
                                    backgroundColor:
                                      colors.primary,
                                  },
                              userIsFollowed &&
                                styles
                                  .tasteFollowingButton,
                              pressed && styles.pressed,
                              isLoadingFollowState &&
                                styles.disabled,
                            ]}
                            onPress={() =>
                              toggleRecommendedPersonFollow(
                                user.id
                              )
                            }
                            disabled={isLoadingFollowState}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: userIsFollowed,
                              disabled:
                                isLoadingFollowState,
                            }}
                            accessibilityLabel={
                              userIsFollowed
                                ? `Unfollow ${user.displayName}`
                                : `Follow ${user.displayName}`
                            }>
                            <AppText
                              variant="label"
                              tone={
                                userIsFollowed
                                  ? 'primary'
                                  : 'onPrimary'
                              }
                              emphasis="strong">
                              {userIsFollowed
                                ? 'Following'
                                : 'Follow'}
                            </AppText>
                          </Pressable>
                        </View>
                      );
                    }
                  )}
                </View>
              </View>
            ) : null}

            {tasteRecommendations.length === 0 &&
            discoverMorePeople.length === 0 ? (
              <View
                style={[
                  styles.emptyTopics,
                  {
                    backgroundColor: colors.surface,
                  },
                ]}>
                <AppText
                  variant="selectionTitle"
                  style={styles.emptyTopicsTitle}>
                  No people to suggest yet
                </AppText>

                <AppText
                  variant="body"
                  tone="tertiary"
                  style={styles.emptyTopicsText}>
                  Check back as more people join
                  the Top 3 community.
                </AppText>
              </View>
            ) : null}
            </>
          ) : (
            <>
            <View>
              <AppText
                variant="sectionTitle"
                style={styles.sectionTitle}>
                {showTrendingCategories
                  ? 'Trending Categories'
                  : 'Featured Categories'}
              </AppText>

              {isLoading ? (
                <View
                  style={[
                    styles.topicsLoading,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}>
                  <ActivityIndicator
                    size="small"
                    color={colors.tertiaryText}
                  />

                  <AppText
                    variant="body"
                    tone="tertiary"
                    style={styles.topicsLoadingText}>
                    Loading categories…
                  </AppText>
                </View>
              ) : (
                <View style={styles.categoryList}>
                  {displayedCategories.map(
                    (category, index) => {
                      const trendingCount =
                        'trendingCount' in category
                          ? category.trendingCount
                          : 0;

                      return (
                        <DiscoverListCard
                          key={category.id}
                          rank={
                            showTrendingCategories
                              ? index + 1
                              : undefined
                          }
                          reserveRankSpace={
                            hasMixedTrendingState
                          }
                          icon={category.icon}
                          title={`All ${category.name}`}
                          metadata={
                            showTrendingCategories
                              ? trendingCount === 1
                                ? '1 recently published Top 3'
                                : `${trendingCount} recently published Top 3s`
                              : getPublishedCountLabel(
                                  category.id
                                )
                          }
                          onPress={() =>
                            openDisplayedCategory(
                              category.id
                            )
                          }
                          accessibilityLabel={
                            !showTrendingCategories &&
                            getPublishedCount(
                              category.id
                            ) === 0
                              ? `Create the first ${category.name} Top 3`
                              : `Browse ${
                                  showTrendingCategories
                                    ? 'trending'
                                    : 'featured'
                                } ${category.name} Top 3 lists`
                          }
                        />
                      );
                    }
                  )}
                </View>
              )}
            </View>
            <View style={styles.topicsSection}>
              <AppText
                variant="sectionTitle"
                style={styles.sectionTitle}>
                {showTrendingTopics
                  ? 'Trending Topics'
                  : 'Featured Genres'}
              </AppText>

              {isLoading ? (
                <View
                  style={[
                    styles.topicsLoading,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}>
                  <ActivityIndicator
                    size="small"
                    color={colors.tertiaryText}
                  />

                  <AppText
                    variant="body"
                    tone="tertiary"
                    style={styles.topicsLoadingText}>
                    Loading topics…
                  </AppText>
                </View>
              ) : (
                <View style={styles.topicList}>
                  {displayedTopics.map((topic, index) => (
                    <DiscoverListCard
                      key={topic.id}
                      rank={
                        showTrendingTopics
                          ? index + 1
                          : undefined
                      }
                      reserveRankSpace={
                        hasMixedTrendingState
                      }
                      icon={topic.categoryIcon}
                      title={`${topic.categoryName} • ${topic.topic}`}
                      metadata={
                        showTrendingTopics
                          ? topic.listCount === 1
                            ? '1 recently published Top 3'
                            : `${topic.listCount} recently published Top 3s`
                          : topic.listCount === 0
  ? 'No published Top 3s yet'
  : getTopicCountLabel(
      topic.listCount
    )
                      }
                      onPress={() =>
                        openDisplayedTopic(topic)
                      }
                      accessibilityLabel={
                        !showTrendingTopics &&
                        topic.listCount === 0
                          ? `Create the first ${topic.categoryName} ${topic.topic} Top 3`
                          : `Browse ${
                              showTrendingTopics
                                ? 'trending'
                                : 'featured'
                            } ${topic.categoryName} ${
                              topic.topic
                            } Top 3 lists`
                      }
                    />
                  ))}
                </View>
              )}
            </View>

            </>
          )
        )}
        </Pressable>
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
    paddingTop: 24,
    paddingBottom: 40,
  },

  headingSection: {
    marginBottom: 24,
  },

  segmentedSection: {
    marginTop: 16,
  },

  contentDismissArea: {
    alignSelf: 'stretch',
  },




  recentSection: {
    flex: 1,
  },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  clearRecentButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  recentList: {
    gap: 10,
  },

  recentSearchCard: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },

  recentSearchAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },

  recentSearchText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },

  removeRecentButton: {
    width: 52,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchResults: {
    flex: 1,
  },

  resultsCaption: {
    marginBottom: 20,
  },

  resultSection: {
    marginBottom: 30,
  },

  sectionTitle: {
    marginBottom: 12,
  },

  categoryList: {
    gap: 12,
  },

  topicsSection: {
    marginTop: 30,
  },


  tasteSection: {
    marginTop: 0,
  },

  discoverMoreSection: {
    marginTop: 30,
  },

  tasteList: {
    gap: 12,
  },

  tasteCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },

  tasteMainContent: {
    flex: 1,
    minWidth: 0,
  },

  tasteProfileAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  newMemberProfileAction: {
    flex: 1,
    minWidth: 0,
  },

  tasteBadgeRow: {
    marginLeft: 64,
  },

  tasteDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  tasteFollowButton: {
    minWidth: 86,
    minHeight: 38,
    marginLeft: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tasteFollowingButton: {
    borderWidth: 1,
  },

  topicList: {
    gap: 12,
  },

  collectionList: {
    gap: 12,
  },

  collectionCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 18,
  },

  collectionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  collectionEmoji: {
    fontSize: 25,
  },

  collectionDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  collectionTitle: {},

  collectionMeta: {
    marginTop: 4,
  },

  peopleList: {
    gap: 12,
  },

  personCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 18,
  },


  personDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  personUsername: {
    marginTop: 3,
  },

  discoverPersonMeta: {
    marginTop: 5,
  },

  topicsLoading: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },

  topicsLoadingText: {
    marginLeft: 9,
  },

  emptyTopics: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 18,
  },

  emptyTopicsTitle: {},

  emptyTopicsText: {
    marginTop: 7,
    textAlign: 'center',
  },

  searchPlaceholder: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 18,
  },

  searchPlaceholderTitle: {
    textAlign: 'center',
  },

  searchPlaceholderText: {
    marginTop: 7,
    textAlign: 'center',
  },

  errorAction: {
    alignSelf: 'stretch',
    marginTop: 20,
  },

  arrow: {
    marginLeft: 10,
  },

  disabled: {
  opacity: 0.5,
},

pressed: {
    opacity: 0.68,
  },
});