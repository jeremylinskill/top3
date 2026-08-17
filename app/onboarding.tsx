import PrimaryButton from '@/components/primary-button';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { buildCollectionTitle } from '@/utils/build-collection-title';
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
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type OnboardingStep =
  | 'intro'
  | 'transitioning'
  | 'category';


const BRAND_HEIGHT = 40;

// These values are intentionally different because the two headline
// compositions have different visual font-box spacing. The result is
// a matching perceived gap between Top 3 and the first headline.
const INTRO_BRAND_GAP = 8;
const CATEGORY_BRAND_GAP = -28;


const ONBOARDING_CATEGORY_ORDER = [
  'movies',
  'tv',
  'albums',
  'artists',
  'songs',
  'books',
  'games',
] as const;


const ONBOARDING_CATEGORIES =
  ONBOARDING_CATEGORY_ORDER
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
        typeof category
      > => Boolean(category)
    );


export default function OnboardingScreen() {
  const {
    startCollection,
    isLoading: isOnboardingCollectionLoading,
  } = useOnboardingCollection();


  const [step, setStep] =
    useState<OnboardingStep>('intro');


  const [stageHeight, setStageHeight] =
    useState(0);

  const [introHeight, setIntroHeight] =
    useState(0);

  const [categoryHeight, setCategoryHeight] =
    useState(0);


  const brandY =
    useRef(new Animated.Value(0)).current;

  const introY =
    useRef(new Animated.Value(0)).current;

  const categoryY =
    useRef(new Animated.Value(0)).current;


  const introOpacity =
    useRef(new Animated.Value(0)).current;

  const categoryTitleOpacity =
    useRef(new Animated.Value(0)).current;

  const categorySubtitleOpacity =
    useRef(new Animated.Value(0)).current;

  const categoryCardOpacities =
    useRef(
      ONBOARDING_CATEGORIES.map(
        () => new Animated.Value(0)
      )
    ).current;

  const introActionsOpacity =
    useRef(new Animated.Value(0)).current;


  const hasPositionedInitialLayout =
    useRef(false);


  const categoryCards = useMemo(
    () =>
      ONBOARDING_CATEGORIES.map(
        (category, index) => ({
          category,
          isLast:
            index ===
            ONBOARDING_CATEGORIES.length - 1,
        })
      ),
    []
  );


  const introBrandY =
    stageHeight > 0 &&
    introHeight > 0
      ? Math.max(
          0,
          (
            stageHeight -
            (
              BRAND_HEIGHT +
              INTRO_BRAND_GAP +
              introHeight
            )
          ) / 2
        )
      : 0;


  const introContentY =
    introBrandY +
    BRAND_HEIGHT +
    INTRO_BRAND_GAP;


  const categoryBrandY =
    stageHeight > 0 &&
    categoryHeight > 0
      ? Math.max(
          0,
          (
            stageHeight -
            (
              BRAND_HEIGHT +
              CATEGORY_BRAND_GAP +
              categoryHeight
            )
          ) / 2
        )
      : 0;


  const categoryContentY =
    categoryBrandY +
    BRAND_HEIGHT +
    CATEGORY_BRAND_GAP;


  useEffect(() => {
    if (
      hasPositionedInitialLayout.current ||
      stageHeight === 0 ||
      introHeight === 0 ||
      categoryHeight === 0
    ) {
      return;
    }


    hasPositionedInitialLayout.current =
      true;


    brandY.setValue(introBrandY);
    introY.setValue(introContentY);
    categoryY.setValue(
      categoryContentY
    );


    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(
          introOpacity,
          {
            toValue: 1,
            duration: 520,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          introActionsOpacity,
          {
            toValue: 1,
            duration: 460,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
      ]),
    ]).start();
  }, [
    brandY,
    categoryContentY,
    categoryHeight,
    categoryY,
    introActionsOpacity,
    introBrandY,
    introContentY,
    introHeight,
    introOpacity,
    introY,
    stageHeight,
  ]);


  function handleStageLayout(
    event: LayoutChangeEvent
  ) {
    setStageHeight(
      event.nativeEvent.layout.height
    );
  }


  function handleIntroLayout(
    event: LayoutChangeEvent
  ) {
    setIntroHeight(
      event.nativeEvent.layout.height
    );
  }


  function handleCategoryLayout(
    event: LayoutChangeEvent
  ) {
    setCategoryHeight(
      event.nativeEvent.layout.height
    );
  }


  function showCategoryStep() {
    if (
      step !== 'intro' ||
      !hasPositionedInitialLayout.current
    ) {
      return;
    }


    setStep('transitioning');


    Animated.sequence([
      Animated.parallel([
        Animated.timing(
          brandY,
          {
            toValue: categoryBrandY,
            duration: 620,
            easing:
              Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          introOpacity,
          {
            toValue: 0,
            duration: 340,
            easing:
              Easing.in(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          introY,
          {
            toValue:
              introContentY - 28,
            duration: 380,
            easing:
              Easing.in(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          introActionsOpacity,
          {
            toValue: 0,
            duration: 280,
            easing:
              Easing.in(Easing.cubic),
            useNativeDriver: true,
          }
        ),
      ]),
      Animated.sequence([
        Animated.timing(
          categoryTitleOpacity,
          {
            toValue: 1,
            duration: 320,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.delay(70),
        Animated.timing(
          categorySubtitleOpacity,
          {
            toValue: 1,
            duration: 360,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.delay(90),
        Animated.stagger(
          75,
          categoryCardOpacities.map(
            (opacity) =>
              Animated.timing(
                opacity,
                {
                  toValue: 1,
                  duration: 360,
                  easing:
                    Easing.out(
                      Easing.cubic
                    ),
                  useNativeDriver: true,
                }
              )
          )
        ),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        setStep('category');
      }
    });
  }


  function chooseCategory(
    categoryId: string
  ) {
    if (isOnboardingCollectionLoading) {
      return;
    }

    startCollection({
      category: categoryId,
      topic: undefined,
      title: buildCollectionTitle(
        categoryId,
        ''
      ),
    });


    router.push('/collection');
  }


  function handleSignIn() {
    router.replace('/sign-in');
  }


  return (
    <SafeAreaView
      style={styles.container}
      edges={[
        'top',
        'left',
        'right',
        'bottom',
      ]}>
      <View
        style={styles.stage}
        onLayout={handleStageLayout}>
        <Animated.Text
          style={[
            styles.brand,
            {
              transform: [
                {
                  translateY:
                    brandY,
                },
              ],
            },
          ]}>
          Top 3
        </Animated.Text>


        {step !== 'category' ? (
          <Animated.View
            pointerEvents={
              step === 'intro'
                ? 'auto'
                : 'none'
            }
            onLayout={
              handleIntroLayout
            }
            style={[
              styles.contentGroup,
              {
                opacity:
                  introOpacity,
                transform: [
                  {
                    translateY:
                      introY,
                  },
                ],
              },
            ]}>
            <Text
              style={styles.headline}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}>
              Your taste says a lot about you.
            </Text>


            <Text
              style={styles.supportingLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}>
              Share your favourites.
            </Text>


            <Text
              style={styles.supportingLine}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.86}>
              Discover people who love the same things.
            </Text>
          </Animated.View>
        ) : null}


        <Animated.View
          pointerEvents={
            step === 'category'
              ? 'auto'
              : 'none'
          }
          onLayout={
            handleCategoryLayout
          }
          style={[
            styles.contentGroup,
            {
              transform: [
                {
                  translateY:
                    categoryY,
                },
              ],
            },
          ]}>
          <Animated.Text
            style={[
              styles.headline,
              {
                opacity:
                  categoryTitleOpacity,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.88}>
            What are your favourites?
          </Animated.Text>


          <Animated.Text
            style={[
              styles.supportingLine,
              {
                opacity:
                  categorySubtitleOpacity,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.9}>
            Choose a category to get started.
          </Animated.Text>


          <View style={styles.categoryGrid}>
            {categoryCards.map(
              (
                {
                  category,
                  isLast,
                },
                index
              ) => (
                <Animated.View
                  key={category.id}
                  style={[
                    styles.categoryCardWrapper,
                    isLast &&
                      styles.lastCategoryCard,
                    {
                      opacity:
                        categoryCardOpacities[
                          index
                        ],
                    },
                  ]}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.categoryCard,
                      pressed &&
                        styles.categoryCardPressed,
                    ]}
                    onPress={() =>
                      chooseCategory(
                        category.id
                      )
                    }
                    disabled={
                      isOnboardingCollectionLoading
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      category.name
                    }>
                    <Text
                      style={
                        styles.categoryIcon
                      }>
                      {category.icon}
                    </Text>


                    <Text
                      style={
                        styles.categoryLabel
                      }>
                      {category.name}
                    </Text>
                  </Pressable>
                </Animated.View>
              )
            )}
          </View>
        </Animated.View>
      </View>


      <View style={styles.bottomArea}>
        {step !== 'category' ? (
          <Animated.View
            pointerEvents={
              step === 'intro'
                ? 'auto'
                : 'none'
            }
            style={{
              opacity:
                introActionsOpacity,
            }}>
            <PrimaryButton
              title="Get Started"
              onPress={showCategoryStep}
            />
          </Animated.View>
        ) : null}


        <View style={styles.signInContainer}>
          <Text style={styles.signInPrompt}>
            Already have an account?
          </Text>


          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.pressed,
            ]}
            onPress={handleSignIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={8}>
            <Text style={styles.signInButtonText}>
              Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  stage: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },


  brand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: BRAND_HEIGHT,
    fontSize: 34,
    lineHeight: BRAND_HEIGHT,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },


  contentGroup: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    alignItems: 'center',
  },


  headline: {
    width: '100%',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },


  supportingLine: {
    width: '100%',
    marginTop: 10,
    fontSize: 17,
    lineHeight: 23,
    color: '#777777',
    textAlign: 'center',
  },


  categoryGrid: {
    width: '100%',
    marginTop: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },


  categoryCardWrapper: {
    width: '48.5%',
  },


  categoryCard: {
    width: '100%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },


  lastCategoryCard: {
    marginLeft: '25.75%',
  },


  categoryCardPressed: {
    opacity: 0.78,
    transform: [
      { scale: 0.98 },
    ],
  },


  categoryIcon: {
    fontSize: 30,
    lineHeight: 38,
  },


  categoryLabel: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },


  bottomArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#F8F8F8',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEA',
  },


  signInContainer: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },


  signInPrompt: {
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
  },


  signInButton: {
    marginLeft: 5,
  },


  signInButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1573DD',
  },


  pressed: {
    opacity: 0.6,
  },
});
