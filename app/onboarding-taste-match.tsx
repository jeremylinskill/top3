import AppText from '@/components/app-text';
import PrimaryButton from '@/components/primary-button';
import {
  TASTE_MATCH_RANK_COLORS,
} from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TOP3_THEME_SUGGESTIONS } from '@/constants/top3-theme-suggestions';
import { useCollectionOptions } from '@/context/collection-options-context';
import { getMusicianRole, getPopularSuggestionsByCategory } from '@/providers/search';
import {
  fetchCollectionOptionSuggestions,
  getCachedCollectionOptionSuggestions,
} from '@/services/collection-option-service';
import { Top3Item } from '@/types/top3-item';
import { TEXT_STYLES } from '@/constants/typography';
import { useTop3 } from '@/context/top3-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { getPublishedPostsByUser } from '@/lib/supabase/collections';
import { Top3List } from '@/types/top3-list';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const DEMO_MATCH_SCORE = 84;


export default function OnboardingTasteMatchScreen() {
  const colors = useAppColors();

  const { height: windowHeight } =
    useWindowDimensions();

  const isCompactHeight =
    windowHeight <= 920;

  const {
    currentList,
  } = useTop3();

  const {
    user,
  } = useAuth();

  const [
    fetchedPublishedCollection,
    setFetchedPublishedCollection,
  ] = useState<Top3List | null>(null);

  const [
    isLoadingPublishedCollection,
    setIsLoadingPublishedCollection,
  ] = useState(false);

  const [
    hasPublishedCollectionLoadError,
    setHasPublishedCollectionLoadError,
  ] = useState(false);

  const [
    publishedCollectionLoadAttempt,
    setPublishedCollectionLoadAttempt,
  ] = useState(0);

  const [animatedScore, setAnimatedScore] =
    useState(0);

  const titleOpacity =
    useRef(new Animated.Value(0)).current;

  const matchOpacity =
    useRef(new Animated.Value(0)).current;

  const matchScale =
    useRef(new Animated.Value(0.96)).current;

  const scoreProgress =
    useRef(new Animated.Value(0)).current;


  const activeCollection = useMemo(
    () =>
      currentList ??
      fetchedPublishedCollection,
    [
      currentList,
      fetchedPublishedCollection,
    ]
  );


  const { getOptionById } = useCollectionOptions();

  const optionId = activeCollection?.collectionOptionId?.trim() ?? '';
  const selectedOption = optionId
    ? getOptionById(optionId)
    : undefined;

  const specificListName =
    selectedOption?.name?.trim() ||
    activeCollection?.topic?.trim() ||
    activeCollection?.type?.trim() ||
    (activeCollection?.themeId
      ? activeCollection.title.replace(/^Top 3\s+/i, '').split('•').pop()?.trim()
      : undefined) ||
    '';

  const isSpecializedList = Boolean(
    optionId ||
    activeCollection?.themeId ||
    activeCollection?.type ||
    (activeCollection?.topic?.trim() &&
      activeCollection.topic.trim().toLowerCase() !== 'general')
  );

  // Key suggestions by list identity so an old async response cannot
  // accidentally appear after the user changes category/type/theme.
  const exampleSelectionKey = JSON.stringify([
    activeCollection?.category ?? '',
    optionId,
    activeCollection?.topic ?? '',
    activeCollection?.type ?? '',
    activeCollection?.themeId ?? '',
  ]);

  const [resolvedDemoSuggestions, setResolvedDemoSuggestions] = useState<{
    key: string;
    titles: string[];
  }>({ key: '', titles: [] });

  useEffect(() => {
    const categoryId = activeCollection?.category ?? '';
    if (!isSpecializedList || !categoryId) return;

    let cancelled = false;
    const accept = (items: Top3Item[]) => {
      if (cancelled) return;
      setResolvedDemoSuggestions({
        key: exampleSelectionKey,
        titles: items
          .map((item) => item.title?.trim())
          .filter((title): title is string => Boolean(title)),
      });
    };

    async function loadExamples() {
      // Use the SAME option-specific suggestions as the main Search screen.
      // The option ID is the identity; the name alone is not reliable.
      if (optionId) {
        let cachedItems: Top3Item[] = [];
        try {
          cachedItems = (await getCachedCollectionOptionSuggestions(optionId))
            .filter((entry) => entry.active)
            .map((entry) => entry.item);
          if (cachedItems.length > 0) accept(cachedItems);
        } catch (error) {
          if (__DEV__) console.log('Could not load cached Taste Match examples:', error);
        }
        try {
          const freshItems = (await fetchCollectionOptionSuggestions(optionId))
            .filter((entry) => entry.active)
            .map((entry) => entry.item);
          if (freshItems.length > 0) {
            accept(freshItems);
            return;
          }
        } catch (error) {
          if (__DEV__) console.log('Could not refresh Taste Match examples:', error);
        }
        if (cachedItems.length > 0) return;
      }

      // Bundled themes remain available when offline; future curated options
      // need no edits here when their suggestions are added to Supabase.
      const lookupNames = [
        selectedOption?.name,
        activeCollection?.topic,
        activeCollection?.type,
        specificListName,
      ];
      for (const name of lookupNames) {
        const bundled = name
          ? TOP3_THEME_SUGGESTIONS[name.trim().toLowerCase()]
          : undefined;
        if (bundled?.length) {
          accept(bundled);
          return;
        }
      }

      // The shared Search provider can give category-specific suggestions for
      // ordinary genres, and for modes with an explicit specialized provider.
      // Do NOT use generic category charts for a new Type or Theme: an
      // unrelated suggestion is worse than an honest placeholder.
      const hasSpecializedProvider = Boolean(
        selectedOption && (
          (selectedOption.providerKey === 'tmdb' &&
            selectedOption.providerMode === 'discover') ||
          (selectedOption.providerKey === 'apple_music' &&
            selectedOption.providerMode === 'current_chart') ||
          getMusicianRole(selectedOption)
        )
      );
      const isGenreWithoutOption = Boolean(
        !optionId &&
        !activeCollection?.type &&
        activeCollection?.topic &&
        activeCollection.topic.toLowerCase() !== 'general'
      );
      if (hasSpecializedProvider || isGenreWithoutOption) {
        try {
          const providerItems = await getPopularSuggestionsByCategory(
            categoryId,
            activeCollection?.topic,
            20,
            undefined,
            selectedOption,
            true
          );
          if (providerItems.length > 0) {
            accept(providerItems);
            return;
          }
        } catch (error) {
          if (__DEV__) console.log('Could not load Taste Match provider examples:', error);
        }
      }
      accept([]);
    }

    void loadExamples();
    return () => { cancelled = true; };
  }, [
    activeCollection?.category,
    activeCollection?.topic,
    activeCollection?.type,
    exampleSelectionKey,
    isSpecializedList,
    optionId,
    selectedOption,
    specificListName,
  ]);

  useEffect(() => {
    if (
      currentList ||
      !user
    ) {
      return;
    }


    let isCancelled = false;

    const authenticatedUserId =
      user.id;


    async function loadLatestPublishedCollection() {
      setIsLoadingPublishedCollection(true);
      setHasPublishedCollectionLoadError(
        false
      );

      try {
        const publishedPosts =
          await getPublishedPostsByUser(
            authenticatedUserId
          );


        if (isCancelled) {
          return;
        }


        setFetchedPublishedCollection(
          publishedPosts[0]?.collection ??
            null
        );
        setHasPublishedCollectionLoadError(
          false
        );
      } catch (error) {
        if (__DEV__) {
          console.log(
            'Failed to load published collection for Taste Match:',
            error
          );
        }


        if (!isCancelled) {
          setFetchedPublishedCollection(null);
          setHasPublishedCollectionLoadError(
            true
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPublishedCollection(
            false
          );
        }
      }
    }


    void loadLatestPublishedCollection();


    return () => {
      isCancelled = true;
    };
  }, [
    currentList,
    publishedCollectionLoadAttempt,
    user,
  ]);


  function retryPublishedCollectionLoad() {
    setHasPublishedCollectionLoadError(
      false
    );
    setPublishedCollectionLoadAttempt(
      (currentAttempt) =>
        currentAttempt + 1
    );
  }


  const userItems =
    activeCollection?.items
      .filter(
        (
          item
        ): item is NonNullable<
          typeof item
        > => Boolean(item)
      )
      .slice(0, 3) ?? [];


  const fallbackTitles = [
    'Your #1 pick',
    'Your #2 pick',
    'Your #3 pick',
  ];


  const userTitles = [
    userItems[0]?.title ??
      fallbackTitles[0],
    userItems[1]?.title ??
      fallbackTitles[1],
    userItems[2]?.title ??
      fallbackTitles[2],
  ];


  const exampleThirdPicksByCategory: Record<
    string,
    string[]
  > = {
    movies: [
      'Interstellar',
      'Goodfellas',
      'Pulp Fiction',
      'The Dark Knight',
    ],
    tv: [
      'The Sopranos',
      'Succession',
      'Mad Men',
      'Better Call Saul',
    ],
    albums: [
      'Rumours',
      'Abbey Road',
      'OK Computer',
      'Purple Rain',
    ],
    artists: [
      'David Bowie',
      'Prince',
      'Fleetwood Mac',
      'Radiohead',
    ],
    songs: [
      'Dreams',
      'Heroes',
      'Purple Rain',
      'God Only Knows',
    ],
    books: [
      '1984',
      'The Great Gatsby',
      'Dune',
      'The Catcher in the Rye',
    ],
    games: [
      'The Legend of Zelda: Breath of the Wild',
      'Red Dead Redemption 2',
      'Super Mario Odyssey',
      'The Last of Us',
    ],
  };


  function normalizeTitle(value: string) {
    return value.trim().toLowerCase();
  }


  // The two matching choices are the user's actual first two picks.
  // Exclude ALL three user picks from Alex's third example.
  const existingExampleTitles = new Set(
    userTitles.map(normalizeTitle)
  );

  const exampleThirdPickChoices = isSpecializedList
    ? resolvedDemoSuggestions.key === exampleSelectionKey
      ? resolvedDemoSuggestions.titles
      : []
    : exampleThirdPicksByCategory[
        activeCollection?.category ?? ''
      ] ?? [];

  const exampleThirdPick = exampleThirdPickChoices.find(
    (title) => !existingExampleTitles.has(normalizeTitle(title))
  ) ?? (
    isSpecializedList && specificListName
      ? `Another ${specificListName} favourite`
      : 'Another favourite'
  );

  const exampleTitles = [
    userTitles[0],
    userTitles[1],
    exampleThirdPick,
  ];

  const category = TOP3_CATEGORIES.find(
    (item) =>
      item.id === activeCollection?.category
  );


  useEffect(() => {
    const scoreListener =
      scoreProgress.addListener(
        ({ value }) => {
          setAnimatedScore(
            Math.round(
              value * DEMO_MATCH_SCORE
            )
          );
        }
      );


    Animated.sequence([
      Animated.delay(140),
      Animated.timing(
        titleOpacity,
        {
          toValue: 1,
          duration: 420,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: true,
        }
      ),
      Animated.delay(110),
      Animated.parallel([
        Animated.timing(
          matchOpacity,
          {
            toValue: 1,
            duration: 440,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          matchScale,
          {
            toValue: 1,
            duration: 520,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          scoreProgress,
          {
            toValue: 1,
            duration: 860,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: false,
          }
        ),
      ]),
    ]).start();


    return () => {
      scoreProgress.removeListener(
        scoreListener
      );
    };
  }, [
    matchOpacity,
    matchScale,
    scoreProgress,
    titleOpacity,
  ]);

  function continueOnboarding() {
    router.push('/onboarding-notifications');
  }


  if (
    !activeCollection &&
    isLoadingPublishedCollection
  ) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <View style={styles.loadState}>
          <ActivityIndicator
            size="large"
            color={colors.text}
          />
        </View>
      </SafeAreaView>
    );
  }


  if (
    !activeCollection &&
    hasPublishedCollectionLoadError
  ) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}>
        <View style={styles.loadState}>
          <AppText
            variant="sectionTitle"
            style={styles.loadErrorTitle}>
            Couldn&apos;t load your Taste Match
          </AppText>

          <AppText
            variant="body"
            tone="tertiary"
            style={styles.loadErrorText}>
            Check your connection and try again.
          </AppText>

          <PrimaryButton
            title="Try Again"
            onPress={
              retryPublishedCollectionLoad
            }
            style={styles.loadErrorAction}
          />
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
        ]}>
      <View
        style={[
          styles.content,
          isCompactHeight &&
            styles.compactContent,
        ]}>
        <View
          style={[
            styles.headerBlock,
            isCompactHeight &&
              styles.compactHeaderBlock,
          ]}>
          <Animated.Text
            style={[
              styles.title,
              TEXT_STYLES.pageTitle,
              {
                color: colors.text,
                opacity:
                  titleOpacity,
              },
            ]}>
            Find people who share
            {'\n'}
            your taste.
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtitle,
              TEXT_STYLES.tasteMatchSubtitle,
              {
                color: colors.secondaryText,
                opacity:
                  titleOpacity,
              },
            ]}>
            See how much you have in common.
          </Animated.Text>
        </View>


        <Animated.View
          style={[
            styles.matchCard,
            isCompactHeight &&
              styles.compactMatchCard,
            {
              backgroundColor: colors.surface,
            },
            {
              opacity:
                matchOpacity,
              transform: [
                {
                  scale:
                    matchScale,
                },
              ],
            },
          ]}>
          <AppText
            variant="tasteMatchLabel">
            Taste Match
          </AppText>


          <AppText
            variant="matchScore"
            style={[
              styles.matchScore,
              isCompactHeight &&
                styles.compactMatchScore,
            ]}>
            {animatedScore}%
          </AppText>


          <AppText
            variant="bodyLarge"
            tone="secondary"
            style={[
              styles.sharedText,
              isCompactHeight &&
                styles.compactSharedText,
            ]}>
            You share 2 ranked picks.
          </AppText>


          <View
            style={[
              styles.comparisonCard,
              isCompactHeight &&
                styles.compactComparisonCard,
            ]}>
            <View
              style={[
                styles.comparisonHeader,
                isCompactHeight &&
                  styles.compactComparisonHeader,
              ]}>
              {category?.icon ? (
                <Text style={styles.categoryIcon}>
                  {category.icon}
                </Text>
              ) : null}

              <AppText variant="sectionTitle">
                {activeCollection?.title?.replace(
                  /^Top 3\s+/i,
                  ''
                ) || 'Your list'}
              </AppText>
            </View>


            <View style={styles.columnHeaderRow}>
              <AppText
                variant="comparisonLabel"
                tone="tertiary"
                style={styles.columnHeader}>
                You
              </AppText>

              <AppText
                variant="comparisonLabel"
                tone="tertiary"
                style={styles.columnHeader}>
                Alex
              </AppText>
            </View>


            {[0, 1, 2].map((index) => {
              const isShared = index < 2;

              return (
                <View
                  key={index}
                  style={[
                    styles.comparisonRow,
                    isCompactHeight &&
                      styles.compactComparisonRow,
                  ]}>
                  <View
                    style={[
                      styles.rankCell,
                      isCompactHeight &&
                        styles.compactRankCell,
                      {
                        backgroundColor:
                          isShared
                            ? TASTE_MATCH_RANK_COLORS[
                                index
                              ]
                            : colors.secondarySurface,
                      },
                    ]}>
                    <AppText
                      variant="comparisonRank"
                      tone={
                        isShared
                          ? 'onHighlight'
                          : 'primary'
                      }>
                      {index + 1}
                    </AppText>

                    <AppText
                      variant="comparisonLabel"
                      tone={
                        isShared
                          ? 'onHighlight'
                          : 'primary'
                      }
                      style={styles.rankTitle}
                      numberOfLines={2}>
                      {userTitles[index]}
                    </AppText>

                  </View>


                  <View
                    style={[
                      styles.rankCell,
                      isCompactHeight &&
                        styles.compactRankCell,
                      {
                        backgroundColor:
                          isShared
                            ? TASTE_MATCH_RANK_COLORS[
                                index
                              ]
                            : colors.secondarySurface,
                      },
                    ]}>
                    <AppText
                      variant="comparisonRank"
                      tone={
                        isShared
                          ? 'onHighlight'
                          : 'primary'
                      }>
                      {index + 1}
                    </AppText>

                    <AppText
                      variant="comparisonLabel"
                      tone={
                        isShared
                          ? 'onHighlight'
                          : 'primary'
                      }
                      style={styles.rankTitle}
                      numberOfLines={2}>
                      {exampleTitles[index]}
                    </AppText>

                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>


      </View>


      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        <PrimaryButton
          title="Continue"
          onPress={continueOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },


  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 20,
  },

  compactContent: {
    paddingTop: 42,
    paddingBottom: 12,
  },



  headerBlock: {
    minHeight: 128,
  },

  compactHeaderBlock: {
    minHeight: 128,
  },


  title: {
    paddingHorizontal: 8,
    textAlign: 'center',
  },


  subtitle: {
    marginTop: 12,
    textAlign: 'center',
  },


  matchCard: {
    marginTop: -4,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 26,
    borderRadius: 22,
    alignItems: 'center',
  },

  compactMatchCard: {
    marginTop: 30,
    paddingTop: 22,
    paddingBottom: 22,
  },


  matchScore: {
    marginTop: 4,
    textAlign: 'center',
  },

  compactMatchScore: {
    marginTop: 2,
  },


  sharedText: {
    marginTop: 6,
    textAlign: 'center',
  },

  compactSharedText: {
    marginTop: 4,
  },


  comparisonCard: {
    width: '100%',
    marginTop: 24,
  },

  compactComparisonCard: {
    marginTop: 18,
  },


  comparisonHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  compactComparisonHeader: {
    marginBottom: 10,
  },


  categoryIcon: {
    marginRight: 8,
    fontSize: 24,
    lineHeight: 28,
  },


  columnHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },


  columnHeader: {
    flex: 1,
  },


  comparisonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  compactComparisonRow: {
    marginTop: 8,
  },


  rankCell: {
    flex: 1,
    minHeight: 66,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  compactRankCell: {
    minHeight: 62,
    paddingVertical: 8,
  },


  rankTitle: {
    flex: 1,
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },

  loadState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  loadErrorTitle: {
    textAlign: 'center',
  },

  loadErrorText: {
    marginTop: 8,
    textAlign: 'center',
  },

  loadErrorAction: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
});