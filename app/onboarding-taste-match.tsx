import PrimaryButton from '@/components/primary-button';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
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
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const DEMO_MATCH_SCORE = 84;


export default function OnboardingTasteMatchScreen() {
  const {
    updateProfile,
  } = useProfile();

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
      } catch (error) {
        console.error(
          'Failed to load published collection for Taste Match:',
          error
        );


        if (!isCancelled) {
          setFetchedPublishedCollection(null);
        }
      }
    }


    void loadLatestPublishedCollection();


    return () => {
      isCancelled = true;
    };
  }, [
    currentList,
    user,
  ]);


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


  const existingExampleTitles = new Set(
    userTitles
      .slice(0, 2)
      .map(normalizeTitle)
  );


  const exampleThirdPick =
    exampleThirdPicksByCategory[
      activeCollection?.category ?? ''
    ]?.find(
      (title) =>
        !existingExampleTitles.has(
          normalizeTitle(title)
        )
    ) ?? 'Another favourite';


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
      ]),
      Animated.delay(80),
      Animated.timing(
        scoreProgress,
        {
          toValue: 1,
          duration: 900,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: false,
        }
      ),
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


  async function finishOnboarding() {
    try {
      await updateProfile({
        hasCompletedOnboarding: true,
      });
    } catch (error) {
      console.error(
        'Failed to complete onboarding:',
        error
      );
    }


    router.replace('/(tabs)');
  }


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>
          Top 3
        </Text>


        <Animated.Text
          style={[
            styles.title,
            {
              opacity:
                titleOpacity,
            },
          ]}>
          Find people who share
          {'\n'}
          your taste.
        </Animated.Text>


        <Animated.View
          style={[
            styles.matchCard,
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
          <Text style={styles.matchLabel}>
            Taste Match
          </Text>


          <Text style={styles.matchScore}>
            {animatedScore}%
          </Text>


          <Text style={styles.sharedText}>
            You share 2 ranked picks.
          </Text>


          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              {category?.icon ? (
                <Text style={styles.categoryIcon}>
                  {category.icon}
                </Text>
              ) : null}

              <Text style={styles.collectionTitle}>
                {activeCollection?.title?.replace(
                  /^Top 3\s+/i,
                  ''
                ) || 'Your collection'}
              </Text>
            </View>


            <View style={styles.columnHeaderRow}>
              <Text style={styles.columnHeader}>
                You
              </Text>

              <Text style={styles.columnHeader}>
                Alex
              </Text>
            </View>


            {[0, 1, 2].map((index) => {
              const isShared = index < 2;

              return (
                <View
                  key={index}
                  style={styles.comparisonRow}>
                  <View
                    style={[
                      styles.rankCell,
                      isShared &&
                        styles.sharedRankCell,
                    ]}>
                    <Text
                      style={styles.rankNumber}>
                      {index + 1}
                    </Text>

                    <Text
                      style={styles.rankTitle}
                      numberOfLines={2}>
                      {userTitles[index]}
                    </Text>

                  </View>


                  <View
                    style={[
                      styles.rankCell,
                      isShared &&
                        styles.sharedRankCell,
                    ]}>
                    <Text
                      style={styles.rankNumber}>
                      {index + 1}
                    </Text>

                    <Text
                      style={styles.rankTitle}
                      numberOfLines={2}>
                      {exampleTitles[index]}
                    </Text>

                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>


      </View>


      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Start Exploring"
          onPress={finishOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },


  brand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },


  title: {
    marginTop: 12,
    paddingHorizontal: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  matchCard: {
    marginTop: 34,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 22,
    alignItems: 'center',
  },


  matchLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: '#777777',
    textAlign: 'center',
  },


  matchScore: {
    marginTop: 4,
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },


  sharedText: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },


  comparisonCard: {
    width: '100%',
    marginTop: 24,
  },


  comparisonHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },


  categoryIcon: {
    marginRight: 8,
    fontSize: 24,
    lineHeight: 28,
  },


  collectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#222222',
  },


  columnHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },


  columnHeader: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#777777',
  },


  comparisonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },


  rankCell: {
    flex: 1,
    minHeight: 66,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },


  sharedRankCell: {
    backgroundColor: '#FFFC04',
  },


  rankNumber: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#222222',
  },


  rankTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#222222',
  },


  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});
