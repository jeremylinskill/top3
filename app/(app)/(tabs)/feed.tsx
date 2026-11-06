import ActionSheet, {
  ActionSheetAction,
} from '@/components/action-sheet';
import AppText from '@/components/app-text';
import { TEXT_STYLES } from '@/constants/typography';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { LinearGradient } from 'expo-linear-gradient';
import CommentsSheet from '@/components/comments-sheet';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import Reanimated from 'react-native-reanimated';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { useCollectionOptions } from '@/context/collection-options-context';
import { getActiveHomeCampaignBanner, dismissHomeCampaignBanner,
  type HomeCampaignBanner } from '@/lib/supabase/home-campaign-banner';
import {
  canPreviewHomeCampaignBanner,
  getHomeBannerPreview,
  dismissHomeBannerPreview,
} from '@/lib/home-banner-preview';
import { resolveNotificationCollection } from '@/utils/resolve-notification-collection';
import { Ionicons } from '@expo/vector-icons';
import { Platform as NavPlatform } from 'react-native';
import Top3Card from '@/components/top3-card';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useBlock } from '@/context/block-context';
import { useComments } from '@/context/comment-context';
import { useFollow } from '@/context/follow-context';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import {
  FLOATING_TAB_BAR_CONTENT_PADDING,
  useTabBarScroll,
} from '@/context/tab-bar-scroll-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { fetchCollectionOptionSuggestions } from '@/services/collection-option-service';
import { getPopularSuggestionsByCategory } from '@/providers/search';
import { useAuth } from '@/hooks/use-auth';
import { sharePublishedCollection } from '@/lib/share';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import {
  createPostReport,
  createUserReport,
  ReportReason,
} from '@/lib/supabase/reports';
import {
  getPublishedPosts,
  hydrateMissingArtworkInPosts,
} from '@/services/post-service';
import { Post } from '@/types/post';
import { UserProfile } from '@/types/user-profile';
import { buildPersonalizedFeed } from '@/utils/build-personalized-feed';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function normalizeTopic(topic?: string) {
  return topic?.trim().toLowerCase() || 'general';
}


function formatSuggestionReason(
  suggestionReason?: string
) {
  if (!suggestionReason) {
    return 'Because this matches your taste';
  }

  const formattedReason = suggestionReason.replace(
    /^Suggested because\s+/i,
    ''
  );

  if (
    /^You both ranked\s+/i.test(
      formattedReason
    )
  ) {
    return `Because ${formattedReason
      .charAt(0)
      .toLowerCase()}${formattedReason.slice(1)}`;
  }

  return formattedReason;
}

type HomeBannerMovie = { id: string; title: string; imageUrl: string };

// Prefer three entirely new posters on pull-to-refresh. If the theme has
// fewer than six eligible posters, reuse only the minimum needed from the
// preceding set. Poster selection is local; no network call is made here.
function pickHomeBannerMovies(
  candidates: HomeBannerMovie[],
  previousIds: readonly string[]
): HomeBannerMovie[] {
  if (candidates.length < 3) return [];
  const previous = new Set(previousIds);
  const shuffle = (movies: HomeBannerMovie[]) => {
    const mixed = [...movies];
    for (let i = mixed.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }
    return mixed;
  };
  const newMovies = candidates.filter(movie => !previous.has(movie.id));
  const previousMovies = candidates.filter(movie => previous.has(movie.id));
  return [...shuffle(newMovies), ...shuffle(previousMovies)].slice(0, 3);
}

type FeedReportSheet =
  | {
      type: 'actions';
      post: Post;
    }
  | {
      type: 'post-reasons';
      post: Post;
    }
  | {
      type: 'confirm-post';
      post: Post;
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'user-reasons';
      post: Post;
    }
  | {
      type: 'confirm-user';
      post: Post;
      reason: ReportReason;
      reasonLabel: string;
    }
  | {
      type: 'confirm-block';
      post: Post;
    }
  | {
      type: 'confirm-unblock';
      post: Post;
    }
  | {
      type: 'report-success';
    }
  | {
      type: 'report-error';
    }
  | {
      type: 'block-success';
      displayName: string;
    }
  | {
      type: 'block-error';
    }
  | {
      type: 'unblock-success';
      displayName: string;
    }
  | {
      type: 'unblock-error';
    }
  | null;

export default function FeedScreen() {
  const colors = useAppColors();
  // Shared Top 3 blue-to-green campaign gradient across light and dark mode.
  const bannerForeground = '#111111';
  const insets = useSafeAreaInsets();
  const { onFeedScroll } = useTabBarScroll();
  // Native iOS refresh pilot: the inset replaces the top content padding.
  // Android retains the exact existing layout and refresh behaviour.
  const nativeRefreshInsetTop = NavPlatform.OS === 'ios'
    ? insets.top + SCREEN_HEADER_HEIGHT + 20
    : 0;
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const {
    scrollHandler: onStickyHeaderScroll,
    headerStyle: stickyHeaderStyle,
    scrollY: floatingCircleScrollY,
  } = useHomeStickyHeader(onFeedScroll, setHeaderScrolled, nativeRefreshInsetTop);

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
  } = useAuth();

  const { profile } = useProfile();

  const {
    blockedUserIds,
    isBlocked,
    blockUser,
    unblockUser,
  } = useBlock();

  const {
    followedUserIds,
    isFollowing,
    toggleFollow,
    isLoading: isLoadingFollowState,
  } = useFollow();

  const {
    posts,
    lists,
    isCollectionsLoaded,
    hasCollectionsLoadError,
    selectList,
    startListWithoutSaving,
  } = useTop3();
  const { options } = useCollectionOptions();
  const [homeBanner, setHomeBanner] = useState<HomeCampaignBanner | null>(null);
  const [homeBannerPreview, setHomeBannerPreview] = useState<HomeCampaignBanner | null>(null);
  const [isDismissingBanner, setIsDismissingBanner] = useState(false);
  const [bannerMovies, setBannerMovies] = useState<HomeBannerMovie[]>([]);
  const bannerMoviePoolRef = useRef<{
    key: string;
    movies: HomeBannerMovie[];
  } | null>(null);
  const bannerShownMovieIdsRef = useRef<string[]>([]);

  // The server only exposes a banner after a verified full-audience send.
  // Refresh on Home focus to pick up new or expired campaigns.
  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!isAuthenticated) {
      setHomeBanner(null);
      setHomeBannerPreview(null);
      return () => { alive = false; };
    }
    setHomeBannerPreview(profile.isAdmin && canPreviewHomeCampaignBanner()
      ? getHomeBannerPreview(profile.id) : null);
    void getActiveHomeCampaignBanner()
      .then(banner => { if (alive) setHomeBanner(banner); })
      .catch(() => { if (alive) setHomeBanner(null); });
    return () => { alive = false; };
  }, [isAuthenticated, profile.id, profile.isAdmin]));

  // Local previews take precedence over any live Development banner. A preview
  // is tied to this administrator and never uses a campaign database row.
  const displayedHomeBanner = homeBannerPreview ?? homeBanner;
  const homeBannerDestination = useMemo(() => displayedHomeBanner
    ? resolveNotificationCollection(displayedHomeBanner.destination, options, { includePodcasts: true })
    : null, [displayedHomeBanner, options]);

  // A challenge should encourage both new lists and revisiting older ones.
  // Publish Update refreshes publishedAt, while in-progress edits can update
  // updatedAt locally before they are shared. Use only the last successful
  // publication as the 90-day participation signal.
  const bannerParticipation = useMemo(() => {
    if (!homeBannerDestination || !isCollectionsLoaded) {
      return { hasPublishedList: false, participatedRecently: false };
    }
    const normalize = (value?: string) => {
      const n = value?.trim().toLowerCase() ?? '';
      return n === 'general' ? '' : n;
    };
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    let hasPublishedList = false;
    let participatedRecently = false;
    for (const list of lists) {
      if (!list.publishedAt || normalize(list.category) !== normalize(homeBannerDestination.category)) {
        continue;
      }
      const matches = homeBannerDestination.collectionOptionId && list.collectionOptionId
        ? normalize(homeBannerDestination.collectionOptionId) === normalize(list.collectionOptionId)
        : normalize(list.type) === normalize(homeBannerDestination.type) &&
          normalize(list.topic) === normalize(homeBannerDestination.topic);
      if (!matches) continue;
      hasPublishedList = true;
      const lastShared = Date.parse(list.publishedAt);
      if (Number.isFinite(lastShared) && lastShared >= ninetyDaysAgo) {
        participatedRecently = true;
        break;
      }
    }
    return { hasPublishedList, participatedRecently };
  }, [homeBannerDestination, isCollectionsLoaded, lists]);

  // A local design preview intentionally bypasses participation eligibility.
  // Real and private database-backed banners hide only after participation
  // within 90 days; older published lists remain eligible for an update.
  const visibleHomeBanner = displayedHomeBanner && homeBannerDestination && isCollectionsLoaded &&
    !hasCollectionsLoadError && (homeBannerPreview !== null || !bannerParticipation.participatedRecently) &&
    new Date(displayedHomeBanner.expiresAt).getTime() > Date.now()
      ? displayedHomeBanner : null;
  const showingLocalPreview = visibleHomeBanner !== null &&
    homeBannerPreview !== null && visibleHomeBanner === homeBannerPreview;
  const bannerMovieKey = visibleHomeBanner && homeBannerDestination
    ? [
        visibleHomeBanner.id,
        homeBannerDestination.category,
        homeBannerDestination.collectionOptionId ?? '',
        homeBannerDestination.topic ?? '',
      ].join('|')
    : '';

  // Preview and live campaigns use this SAME poster row. Fetch titles from
  // the selected movie theme only; never mix unrelated globally popular films.
  // The row is decorative: tapping anywhere in the banner still opens the Top 3.
  useEffect(() => {
    let cancelled = false;
    const destination = homeBannerDestination;
    if (!bannerMovieKey || !destination || destination.category !== 'movies') {
      bannerMoviePoolRef.current = null;
      bannerShownMovieIdsRef.current = [];
      setBannerMovies([]);
      return () => { cancelled = true; };
    }
    // A new banner object returned by Home refresh must not start a new
    // TMDB request or reset the three posters we just rotated.
    if (bannerMoviePoolRef.current?.key === bannerMovieKey) {
      return () => { cancelled = true; };
    }
    setBannerMovies([]);
    bannerShownMovieIdsRef.current = [];
    const matchingOption = options.find(option =>
      option.id === destination.collectionOptionId && option.categoryId === 'movies'
    );
    const load = async () => {
      try {
        const curated = matchingOption &&
          !(matchingOption.providerKey === 'tmdb' && matchingOption.providerMode === 'discover')
          ? (await fetchCollectionOptionSuggestions(matchingOption.id)).map(row => row.item)
          : [];
        const candidates = curated.length >= 3
          ? curated
          : matchingOption &&
            !(matchingOption.providerKey === 'tmdb' && matchingOption.providerMode === 'discover')
            ? curated
            : await getPopularSuggestionsByCategory(
                'movies', destination.topic, 20, undefined, matchingOption
              );
        const seen = new Set<string>();
        const eligible: HomeBannerMovie[] = candidates.filter(item => {
          if (!item.imageUrl || !item.title?.trim() || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).slice(0, 15).map(item => ({
          id: item.id, title: item.title, imageUrl: item.imageUrl!,
        }));
        if (!cancelled) {
          bannerMoviePoolRef.current = { key: bannerMovieKey, movies: eligible };
          const initial = pickHomeBannerMovies(eligible, []);
          bannerShownMovieIdsRef.current = initial.map(movie => movie.id);
          setBannerMovies(initial);
        }
      } catch {
        // Poster artwork is optional. Never block the campaign CTA or Home.
        if (!cancelled) {
          bannerMoviePoolRef.current = null;
          bannerShownMovieIdsRef.current = [];
          setBannerMovies([]);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [bannerMovieKey, options]);

  function openHomeCampaignBanner() {
    if (!visibleHomeBanner || !homeBannerDestination || !isCollectionsLoaded || hasCollectionsLoadError) {
      Alert.alert('Top 3 unavailable', 'Please try again once your lists are loaded.');
      return;
    }
    const normalize = (value?: string) => {
      const n = value?.trim().toLowerCase() ?? '';
      return n === 'general' ? '' : n;
    };
    const matching = lists.filter(list => {
      if (normalize(list.category) !== normalize(homeBannerDestination.category)) return false;
      if (homeBannerDestination.collectionOptionId && list.collectionOptionId)
        return normalize(homeBannerDestination.collectionOptionId) === normalize(list.collectionOptionId);
      return normalize(list.type) === normalize(homeBannerDestination.type) &&
        normalize(list.topic) === normalize(homeBannerDestination.topic);
    });
    const existing = matching.find(list => Boolean(list.publishedAt)) ??
      matching.find(list => list.items.some(item => item !== null)) ?? matching[0];
    const listId = existing
      ? (selectList(existing.id), existing.id)
      : startListWithoutSaving(homeBannerDestination);
    router.push({ pathname: '/collection', params: { listId } });
  }

  async function dismissCurrentHomeBanner() {
    if (!visibleHomeBanner || isDismissingBanner) return;
    if (showingLocalPreview) {
      dismissHomeBannerPreview(profile.id);
      setHomeBannerPreview(null);
      return;
    }
    const campaignId = visibleHomeBanner.id;
    setIsDismissingBanner(true);
    try {
      await dismissHomeCampaignBanner(campaignId);
      setHomeBanner(current => current?.id === campaignId ? null : current);
    } catch {
      Alert.alert('Unable to dismiss', 'Please try again.');
    } finally {
      setIsDismissingBanner(false);
    }
  }


  const postsRef =
    useRef(posts);

  postsRef.current = posts;

  const { loadCommentCounts } =
    useComments();

  const [feedPosts, setFeedPosts] = useState<
    Post[]
  >([]);

  const [feedAuthors, setFeedAuthors] =
    useState<Record<string, UserProfile>>({});

  const [isLoadingFeed, setIsLoadingFeed] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [selectedHomeCategory, setSelectedHomeCategory] = useState('all');

  const artworkHydrationRunRef =
    useRef(0);


  const [
    selectedCommentsPost,
    setSelectedCommentsPost,
  ] = useState<Post | null>(null);

  const [
    reportSheet,
    setReportSheet,
  ] = useState<FeedReportSheet>(null);

  function hydrateFeedArtworkInBackground(
    sourcePosts: Post[]
  ) {
    const hydrationRun =
      ++artworkHydrationRunRef.current;

    void hydrateMissingArtworkInPosts(
      sourcePosts
    )
      .then((hydratedPosts) => {
        if (
          hydrationRun !==
          artworkHydrationRunRef.current
        ) {
          return;
        }

        setFeedPosts(
          hydratedPosts
        );
      })
      .catch((error) => {
        if (__DEV__) {
          console.log(
            'Failed to hydrate feed artwork:',
            error
          );
        }
      });
  }

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setFeedPosts([]);
      setFeedAuthors({});
      setIsLoadingFeed(false);
      return;
    }

    if (!profile.id) {
      return;
    }

    let isMounted = true;

    async function loadFeedPosts() {
      setIsLoadingFeed(true);

      try {
        const nextPosts =
          await getPublishedPosts({
            hydrateMissingArtwork: false,
          });

        const authorIds = Array.from(
          new Set(
            nextPosts
              .map((post) => post.authorId)
              .filter(
                (authorId) =>
                  authorId !== profile.id
              )
          )
        );

        const authors =
          await getProfilesByIds(
            authorIds
          );

        const nextFeedAuthors =
          authors.reduce<
            Record<string, UserProfile>
          >((authorMap, author) => {
            authorMap[author.id] = author;

            return authorMap;
          }, {});

        if (isMounted) {
          setFeedPosts(nextPosts);
          setFeedAuthors(nextFeedAuthors);

          hydrateFeedArtworkInBackground(
            nextPosts
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load feed posts:',
            error
          );
        }

        if (isMounted) {
          setFeedPosts(
            postsRef.current
          );
          setFeedAuthors({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
        }
      }
    }

    void loadFeedPosts();

    return () => {
      isMounted = false;
    };
  }, [
    isAuthenticated,
    isAuthLoading,
    profile.id,
  ]);

  const visibleFeedPosts = useMemo(
    () =>
      feedPosts.filter(
        (post) =>
          post.authorId === profile.id ||
          !blockedUserIds.includes(post.authorId)
      ),
    [
      feedPosts,
      blockedUserIds,
      profile.id,
    ]
  );

  const personalizedFeed = useMemo(
    () =>
      buildPersonalizedFeed({
        posts: visibleFeedPosts,
        profilesByUserId: feedAuthors,
        currentUserId: profile.id,
        followedUserIds,
      }),
    [
      visibleFeedPosts,
      feedAuthors,
      followedUserIds,
      profile.id,
    ]
  );

  // Derive pills ONLY from published lists already available in the
  // viewer's Home feed (after blocked-user filtering). No extra query and
  // no empty-category filters. Display present categories alphabetically.
  const availableHomeCategories = useMemo(() => {
    const published = new Set<string>();
    for (const { post } of personalizedFeed) {
      const category = post.collection.category?.trim();
      if (category) published.add(category);
    }
    const known = TOP3_CATEGORIES
      .filter(category => published.has(category.id))
      .map(category => ({ id: category.id, label: category.name }));
    const knownIds = new Set<string>(known.map(category => category.id));
    // Show future published category IDs even if not yet in local constants.
    const additional = [...published]
      .filter(id => !knownIds.has(id))
      .sort()
      .map(id => ({
        id,
        label: id.replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      }));
    return [...known, ...additional].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    );
  }, [personalizedFeed]);

  // If a category loses its final visible post (e.g. after a block or
  // refresh), restore All rather than leave Home showing an empty list.
  useEffect(() => {
    if (selectedHomeCategory !== 'all' &&
        !availableHomeCategories.some(category => category.id === selectedHomeCategory)) {
      setSelectedHomeCategory('all');
    }
  }, [selectedHomeCategory, availableHomeCategories]);

  const categoryFilteredFeed = useMemo(() =>
    selectedHomeCategory === 'all'
      ? personalizedFeed
      : personalizedFeed.filter(({ post }) =>
          post.collection.category === selectedHomeCategory
        ),
    [personalizedFeed, selectedHomeCategory]
  );

  const feedCollectionIds = useMemo(
    () =>
      Array.from(
        new Set(
          personalizedFeed.map(
            ({ post }) =>
              post.collection.id
          )
        )
      ),
    [personalizedFeed]
  );

  const feedCollectionIdsKey = useMemo(
    () =>
      [...feedCollectionIds]
        .sort()
        .join('|'),
    [feedCollectionIds]
  );

  useEffect(() => {
    if (
      isLoadingFeed ||
      !feedCollectionIdsKey
    ) {
      return;
    }

    const collectionIds =
      feedCollectionIdsKey.split('|');

    void loadCommentCounts(collectionIds);
  }, [
    isLoadingFeed,
    feedCollectionIdsKey,
    loadCommentCounts,
  ]);

  function getPostAuthor(
    authorId: string
  ): UserProfile | null {
    if (authorId === profile.id) {
      return profile;
    }

    return feedAuthors[authorId] ?? null;
  }

  function openAuthorProfile(
    authorId: string
  ) {
    router.push({
      pathname: '/public-profile',
      params: {
        userId: authorId,
      },
    });
  }

  function openPost(post: Post) {
    router.push({
      pathname: '/published-top3',
      params: {
        postId: post.id,
      },
    });
  }

  function openCreateScreen() {
    router.push('/top3');
  }

  function openCollectionFeed(post: Post) {
    router.push({
      pathname: '/category-feed',
      params: {
        collectionScope: 'specific',
        category:
          post.collection.category,
        topic: normalizeTopic(
          post.collection.topic
        ),
        ...(post.collection.type
          ? { type: post.collection.type }
          : {}),
      },
    });
  }

  function editCollection(post: Post) {
    router.push({
      pathname: '/collection',
      params: {
        listId: post.collection.id,
      },
    });
  }

  function openComments(post: Post) {
    setSelectedCommentsPost(post);
  }

  async function shareCollection(post: Post) {
    await sharePublishedCollection({
      postId: post.id,
      title: post.collection.title,
      source: 'feed',
    });
  }

  function closeComments() {
    setSelectedCommentsPost(null);
  }

  function closeReportSheet() {
    setReportSheet(null);
  }

  function openPostActions(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'actions',
      post,
    });
  }

  function openReportPostReasons(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'post-reasons',
      post,
    });
  }

  function confirmPostReport(
    post: Post,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'confirm-post',
      post,
      reason,
      reasonLabel,
    });
  }

  function openReportUserReasons(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'user-reasons',
      post,
    });
  }

  function confirmUserReport(
    post: Post,
    reason: ReportReason,
    reasonLabel: string
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'confirm-user',
      post,
      reason,
      reasonLabel,
    });
  }

  function confirmBlockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'confirm-block',
      post,
    });
  }

  function confirmUnblockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    setReportSheet({
      type: 'confirm-unblock',
      post,
    });
  }

  async function handleReportPost(
    post: Post,
    reason: ReportReason
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await createPostReport({
        reporterId: profile.id,
        reportedUserId: post.authorId,
        reportedPostId: post.id,
        reason,
      });

      setReportSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report Top 3 from feed:',
        error
      );

      setReportSheet({
        type: 'report-error',
      });
    }
  }

  async function handleReportUser(
    post: Post,
    reason: ReportReason
  ) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await createUserReport({
        reporterId: profile.id,
        reportedUserId: post.authorId,
        reason,
      });

      setReportSheet({
        type: 'report-success',
      });
    } catch (error) {
      console.error(
        'Failed to report user from feed:',
        error
      );

      setReportSheet({
        type: 'report-error',
      });
    }
  }

  async function handleBlockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await blockUser(post.authorId);

      const author =
        getPostAuthor(post.authorId);

      setReportSheet({
        type: 'block-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to block user from feed:',
        error
      );

      setReportSheet({
        type: 'block-error',
      });
    }
  }

  async function handleUnblockUser(post: Post) {
    if (post.authorId === profile.id) {
      return;
    }

    try {
      await unblockUser(post.authorId);

      const author =
        getPostAuthor(post.authorId);

      setReportSheet({
        type: 'unblock-success',
        displayName:
          author?.displayName ?? 'This user',
      });
    } catch (error) {
      console.error(
        'Failed to unblock user from feed:',
        error
      );

      setReportSheet({
        type: 'unblock-error',
      });
    }
  }

  let reportSheetTitle:
    | string
    | undefined;
  let reportSheetMessage:
    | string
    | undefined;
  let reportSheetActions:
    ActionSheetAction[] = [];

  if (reportSheet) {
    switch (reportSheet.type) {
      case 'actions': {
        const userIsBlocked =
          isBlocked(
            reportSheet.post.authorId
          );

        reportSheetActions = [
          {
            label: 'Report List',
            onPress: () =>
              openReportPostReasons(
                reportSheet.post
              ),
          },
          {
            label: 'Report User',
            onPress: () =>
              openReportUserReasons(
                reportSheet.post
              ),
          },
          {
            label: userIsBlocked
              ? 'Unblock User'
              : 'Block User',
            variant: userIsBlocked
              ? 'default'
              : 'destructive',
            onPress: userIsBlocked
              ? () =>
                  confirmUnblockUser(
                    reportSheet.post
                  )
              : () =>
                  confirmBlockUser(
                    reportSheet.post
                  ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'post-reasons':
        reportSheetTitle =
          'Report List';
        reportSheetMessage =
          'Why are you reporting this list?';

        reportSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmPostReport(
                reportSheet.post,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'confirm-post':
        reportSheetTitle =
          'Report this list?';
        reportSheetMessage =
          `Reason: ${reportSheet.reasonLabel}`;

        reportSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                post,
                reason,
              } = reportSheet;

              void handleReportPost(
                post,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'user-reasons':
        reportSheetTitle =
          'Report User';
        reportSheetMessage =
          'Why are you reporting this user?';

        reportSheetActions = [
          {
            label: 'Spam',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'spam',
                'Spam'
              ),
          },
          {
            label: 'Harassment or bullying',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'harassment',
                'Harassment or bullying'
              ),
          },
          {
            label: 'Hate or abusive content',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'hate_or_abuse',
                'Hate or abusive content'
              ),
          },
          {
            label: 'Inappropriate content',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'inappropriate_content',
                'Inappropriate content'
              ),
          },
          {
            label: 'Impersonation',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'impersonation',
                'Impersonation'
              ),
          },
          {
            label: 'Other',
            onPress: () =>
              confirmUserReport(
                reportSheet.post,
                'other',
                'Other'
              ),
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'confirm-user': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Report ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          `Reason: ${reportSheet.reasonLabel}`;

        reportSheetActions = [
          {
            label: 'Submit Report',
            variant: 'destructive',
            onPress: () => {
              const {
                post,
                reason,
              } = reportSheet;

              void handleReportUser(
                post,
                reason
              );
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'confirm-block': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Block ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          'They will no longer be connected to you through following, and you can unblock them later.';

        reportSheetActions = [
          {
            label: 'Block',
            variant: 'destructive',
            onPress: () => {
              const post =
                reportSheet.post;

              closeReportSheet();
              void handleBlockUser(post);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'confirm-unblock': {
        const author =
          getPostAuthor(
            reportSheet.post.authorId
          );

        reportSheetTitle =
          `Unblock ${author?.displayName ?? 'this user'}?`;
        reportSheetMessage =
          'You can follow each other again after unblocking.';

        reportSheetActions = [
          {
            label: 'Unblock',
            onPress: () => {
              const post =
                reportSheet.post;

              closeReportSheet();
              void handleUnblockUser(post);
            },
          },
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
      }

      case 'report-success':
        reportSheetTitle =
          'Report submitted';
        reportSheetMessage =
          'Thanks for letting us know. Your report has been submitted for review.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'report-error':
        reportSheetTitle =
          'Unable to submit report';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'block-success':
        reportSheetTitle = 'User blocked';
        reportSheetMessage =
          `${reportSheet.displayName} has been blocked.`;

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'block-error':
        reportSheetTitle =
          'Unable to block user';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'unblock-success':
        reportSheetTitle = 'User unblocked';
        reportSheetMessage =
          `${reportSheet.displayName} has been unblocked.`;

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;

      case 'unblock-error':
        reportSheetTitle =
          'Unable to unblock user';
        reportSheetMessage =
          'Please try again.';

        reportSheetActions = [
          {
            label: 'OK',
            variant: 'cancel',
            onPress: closeReportSheet,
          },
        ];
        break;
    }
  }

  function toggleAuthorFollow(
    authorId: string
  ) {
    if (
      authorId === profile.id ||
      isLoadingFollowState
    ) {
      return;
    }

    toggleFollow(authorId);
  }

  async function refreshFeed() {
    if (!isAuthenticated || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    // Rotate from the already-loaded candidate pool, with no extra TMDB fetch.
    const currentBannerPool = bannerMoviePoolRef.current;
    if (currentBannerPool?.key === bannerMovieKey) {
      const nextMovies = pickHomeBannerMovies(
        currentBannerPool.movies, bannerShownMovieIdsRef.current
      );
      if (nextMovies.length === 3) {
        bannerShownMovieIdsRef.current = nextMovies.map(movie => movie.id);
        setBannerMovies(nextMovies);
      }
    }
    void getActiveHomeCampaignBanner()
      .then(setHomeBanner)
      .catch(() => {});

    try {
      const nextPosts =
        await getPublishedPosts({
          hydrateMissingArtwork: false,
        });

      const authorIds = Array.from(
        new Set(
          nextPosts
            .map((post) => post.authorId)
            .filter(
              (authorId) =>
                authorId !== profile.id
            )
        )
      );

      const authors =
        await getProfilesByIds(
          authorIds
        );

      const nextFeedAuthors =
        authors.reduce<
          Record<string, UserProfile>
        >((authorMap, author) => {
          authorMap[author.id] = author;

          return authorMap;
        }, {});

      setFeedPosts(nextPosts);
      setFeedAuthors(nextFeedAuthors);

      hydrateFeedArtworkInBackground(
        nextPosts
      );
    } catch (error) {
      if (__DEV__) {
        console.log(
          'Failed to refresh feed posts:',
          error
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  function renderFeedItem({
    item,
  }: {
    item: (typeof personalizedFeed)[number];
  }) {
    const {
      post,
      isSuggested,
      suggestionReason,
      sharedItemTitles,
    } = item;

    const author =
      getPostAuthor(
        post.authorId
      );

    if (!author) {
      return null;
    }

    const isCurrentUserPost =
      post.authorId ===
      profile.id;

    const authorIsFollowed =
      isFollowing(
        post.authorId
      );

    return (
      <View style={styles.feedItem}>
        <Top3Card
          post={post}
          author={author}
          showAuthor
          recommendationTitle={
            isSuggested
              ? 'Recommended for you'
              : undefined
          }
          recommendationReason={
            isSuggested
              ? formatSuggestionReason(
                  suggestionReason
                )
              : undefined
          }
          tasteMatchItemTitles={
            sharedItemTitles
          }
          showFollowButton={
            isSuggested &&
            !isCurrentUserPost
          }
          isFollowingAuthor={
            authorIsFollowed
          }
          isFollowLoading={
            isLoadingFollowState
          }
          onFollowPress={
            isSuggested &&
            !isCurrentUserPost
              ? () =>
                  toggleAuthorFollow(
                    post.authorId
                  )
              : undefined
          }
          onAuthorPress={() =>
            openAuthorProfile(
              post.authorId
            )
          }
          onTitlePress={() =>
            openCollectionFeed(
              post
            )
          }
          onPress={() =>
            openPost(post)
          }
          onEditPress={
            isCurrentUserPost
              ? () =>
                  editCollection(
                    post
                  )
              : undefined
          }
          onMorePress={
            !isCurrentUserPost
              ? () =>
                  openPostActions(
                    post
                  )
              : undefined
          }
          onCommentsPress={() =>
            openComments(post)
          }
          onSharePress={() => {
            void shareCollection(post);
          }}
        />
      </View>
    );
  }

  const featuredBanner = visibleHomeBanner ? (
    <LinearGradient
      colors={['#00D898', '#00D5CC', '#00D2FF']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.homeBanner}>
      <View style={styles.homeBannerHeader}>
        <Text style={[TEXT_STYLES.label, { color: bannerForeground }]}>
          Take the Top 3 Challenge
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss featured Top 3"
          disabled={isDismissingBanner}
          onPress={() => { void dismissCurrentHomeBanner(); }}
          hitSlop={12}
          style={styles.bannerClose}>
          <Ionicons name="close" size={20} color={bannerForeground} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button"
        accessibilityLabel={`${bannerParticipation.hasPublishedList ? 'Review or update' : 'Create'} ${visibleHomeBanner.title}`}
        onPress={openHomeCampaignBanner} style={styles.homeBannerBody}>
        <Text style={[TEXT_STYLES.headline, { color: bannerForeground }]}>
          {visibleHomeBanner.title}
        </Text>
        <Text style={[TEXT_STYLES.body, { color: bannerForeground }]}>
          {visibleHomeBanner.message}
        </Text>
        {bannerMovies.length === 3 ? (
          <View style={styles.homeBannerMovies} accessibilityLabel="Example movies for this Top 3">
            {bannerMovies.map(movie => (
              <View key={movie.id} style={styles.homeBannerMovie}>
                <Image source={{ uri: movie.imageUrl }}
                  style={styles.homeBannerPoster} resizeMode="cover"
                  accessible accessibilityLabel={`${movie.title} movie poster`} />
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </LinearGradient>
  ) : null;

  // The pills and campaign scroll with the feed. Category filtering never
  // fetches or reorders posts, and unrelated campaigns appear only on All.
  const homeFeedHeader = (
    <View>
      {availableHomeCategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterScroll}
          contentContainerStyle={styles.categoryFilterContent}>
          {[{ id: 'all', label: 'All' }, ...availableHomeCategories].map(category => {
            const selected = selectedHomeCategory === category.id;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={category.id === 'all'
                  ? 'Show all Top 3 lists'
                  : `Show ${category.label} Top 3 lists`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedHomeCategory(category.id)}
                hitSlop={{ top: 3, bottom: 3 }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                  },
                ]}>
                <AppText
                  variant="label"
                  tone={selected ? 'onPrimary' : 'primary'}
                  emphasis="semibold">
                  {category.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {selectedHomeCategory === 'all' ? featuredBanner : null}
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={personalizedFeed.length > 0 ? ['left', 'right'] : ['top', 'left', 'right']}>
      {personalizedFeed.length > 0 ? (
        <Reanimated.View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + SCREEN_HEADER_HEIGHT + 16,
              zIndex: 30,
            },
            stickyHeaderStyle,
          ]}>
      <ScreenHeader
                featheredBackdrop
        androidStatusBarGlass
        overlay={personalizedFeed.length > 0}
        scrolled={headerScrolled} floatingCircleScrollY={floatingCircleScrollY}
      />
        </Reanimated.View>
      ) : (
        <ScreenHeader />
      )}

      {isLoadingFeed ? (
        <View style={styles.loadingState}>
          <AppText
            variant="bodyLarge"
            tone="tertiary"
            style={styles.loadingText}>
            Loading feed…
          </AppText>
        </View>
      ) : personalizedFeed.length === 0 ? (
        <View style={styles.content}>
          {featuredBanner}
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
              },
            ]}>
            <AppText
              variant="stateTitle"
              style={styles.emptyTitle}>
              Nothing published
            </AppText>

            <AppText
              variant="bodyLarge"
              tone="tertiary"
              style={styles.emptyText}>
              Publish a Top 3 to see it here.
            </AppText>

            <PrimaryButton
              title="Create a Top 3"
              onPress={openCreateScreen}
              style={styles.emptyAction}
            />
          </View>
        </View>
      ) : (
        <Reanimated.FlatList
          data={categoryFilteredFeed}
          keyExtractor={({ post }) =>
            post.id
          }
          renderItem={renderFeedItem}
          ListHeaderComponent={homeFeedHeader}
          onScroll={onStickyHeaderScroll}
          scrollEventThrottle={16}
          // On iOS, UIScrollView manages the native refresh indicator
          // relative to the top content inset instead of a padded child.
          contentInset={NavPlatform.OS === 'ios' ? { top: nativeRefreshInsetTop } : undefined}
          contentOffset={NavPlatform.OS === 'ios' ? { x: 0, y: -nativeRefreshInsetTop } : undefined}
          contentInsetAdjustmentBehavior={NavPlatform.OS === 'ios' ? 'never' : undefined}
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: NavPlatform.OS === 'ios' ? 0 : SCREEN_HEADER_HEIGHT + 20 +
                insets.top,
              paddingBottom:
                insets.bottom + FLOATING_TAB_BAR_CONTENT_PADDING,
            },
          ]}
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor={colors.secondaryText}
              colors={[colors.secondaryText]}
            />
          }
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={50}
          windowSize={5}
        />
      )}

      <ActionSheet
        visible={reportSheet !== null}
        title={reportSheetTitle}
        message={reportSheetMessage}
        actions={reportSheetActions}
        onClose={closeReportSheet}
      />

      <CommentsSheet
        visible={
          selectedCommentsPost !== null
        }
        post={selectedCommentsPost}
        onClose={closeComments}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  feedItem: {
    marginBottom: 16,
  },
  categoryFilterScroll: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    gap: SPACING.sm,
  },
  categoryPill: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBanner: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    gap: 6,
  },
  homeBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerClose: {
    padding: 3,
  },
  homeBannerBody: {
    gap: 10,
    paddingBottom: 0,
  },
  homeBannerMovies: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  homeBannerMovie: {
    flex: 1,
    minWidth: 0,
  },
  homeBannerPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: '#666666',
  },

  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
  },

  loadingText: {},

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.xl,
  },

  emptyTitle: {
    marginBottom: 8,
  },

  emptyText: {
    textAlign: 'center',
  },

  emptyAction: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});