import PrimaryButton from '@/components/primary-button';
import { COLORS } from '@/constants/colors';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { useOnboardingCollection } from '@/context/onboarding-collection-context';
import { buildCollectionTitle } from '@/utils/build-collection-title';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


type OnboardingStep =
  | 'intro'
  | 'transitioning'
  | 'category';


const SPLASH_ICON_SIZE = 200;
const BRAND_HEIGHT = 40;

// These values are intentionally different because the two headline
// compositions have different visual font-box spacing. The result is
// a matching perceived gap between Top 3 and the first headline.
const CATEGORY_BRAND_GAP = 16;


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

  const { height: windowHeight } =
    useWindowDimensions();

  const insets = useSafeAreaInsets();


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
    useRef(new Animated.Value(1)).current;

  const introTitleOpacity =
    useRef(new Animated.Value(0)).current;

  const introFirstLineOpacity =
    useRef(new Animated.Value(0)).current;

  const introSecondLineOpacity =
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

  const introFooterOpacity =
    useRef(new Animated.Value(0)).current;


  const hasPositionedInitialLayout =
    useRef(false);

  const hasRequestedSplashHide =
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



  /*
   * Keep the welcome-screen type locked to the same vertical positions
   * used by the category-selection screen so Top 3, the headline, and
   * the supporting copy do not jump when Get Started is tapped.
   */
  const introBrandY =
    categoryBrandY;

  const introContentY =
    introBrandY +
    BRAND_HEIGHT +
    CATEGORY_BRAND_GAP;

  /*
   * Match the native Expo splash exactly.
   *
   * The native splash icon is centred in the full device window.
   * This stage begins below the top safe-area inset, so subtracting
   * that inset places the React Native icon's centre at the exact
   * physical centre of the screen.
   */
  const introIconY =
    windowHeight / 2 -
    insets.top -
    SPLASH_ICON_SIZE / 2;


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

    if (!hasRequestedSplashHide.current) {
      hasRequestedSplashHide.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void SplashScreen.hideAsync();
        });
      });
    }


    Animated.sequence([
      Animated.delay(400),
      Animated.timing(
        introTitleOpacity,
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
        introFirstLineOpacity,
        {
          toValue: 1,
          duration: 340,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: true,
        }
      ),
      Animated.delay(70),
      Animated.timing(
        introSecondLineOpacity,
        {
          toValue: 1,
          duration: 360,
          easing:
            Easing.out(Easing.cubic),
          useNativeDriver: true,
        }
      ),
      Animated.delay(90),
      Animated.parallel([
        Animated.timing(
          introActionsOpacity,
          {
            toValue: 1,
            duration: 420,
            easing:
              Easing.out(Easing.cubic),
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          introFooterOpacity,
          {
            toValue: 1,
            duration: 420,
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
    introFirstLineOpacity,
    introFooterOpacity,
    introBrandY,
    introContentY,
    introHeight,
    introOpacity,
    introSecondLineOpacity,
    introTitleOpacity,
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
      style={[
        styles.container,
        step !== 'category' &&
          styles.introContainer,
      ]}
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
            <Animated.Text
              style={[
                styles.headline,
                {
                  opacity:
                    introTitleOpacity,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}>
              Your taste says a lot about you.
            </Animated.Text>


            <Animated.Text
              style={[
                styles.supportingLine,
                {
                  opacity:
                    introFirstLineOpacity,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}>
              Share your favourites.
            </Animated.Text>


            <Animated.Text
              style={[
                styles.supportingLine,
                {
                  opacity:
                    introSecondLineOpacity,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.86}>
              Discover people who love the same things.
            </Animated.Text>
          </Animated.View>
        ) : null}


        {step === 'intro' ? (
          <Animated.Image
            source={require('@/assets/images/splash-icon.png')}
            style={[
              styles.splashIcon,
              {
                transform: [
                  {
                    translateY: introIconY,
                  },
                ],
              },
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
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


      <View
        style={[
          styles.bottomArea,
          step !== 'category' &&
            styles.introBottomArea,
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bottomRule,
            {
              opacity:
                step === 'category'
                  ? 1
                  : introFooterOpacity,
            },
          ]}
        />

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


        <Animated.View
          style={[
            styles.signInContainer,
            {
              opacity:
                step === 'category'
                  ? 1
                  : introFooterOpacity,
            },
          ]}>
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
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },


  introContainer: {
    backgroundColor: '#FFFFFF',
  },


  stage: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },


  splashIcon: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: SPLASH_ICON_SIZE,
    height: SPLASH_ICON_SIZE,
    marginLeft: -(SPLASH_ICON_SIZE / 2),
    zIndex: 10,
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
    ...TYPOGRAPHY.pageTitle,
    width: '100%',
    textAlign: 'center',
  },


  supportingLine: {
    width: '100%',
    marginTop: 10,
    fontSize: 17,
    lineHeight: 23,
    color: '#222222',
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
    ...TYPOGRAPHY.bodyLarge,
    marginTop: 8,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },


  bottomArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#F8F8F8',
  },


  bottomRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EAEAEA',
  },


  introBottomArea: {
    backgroundColor: '#FFFFFF',
  },


  signInContainer: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },


  signInPrompt: {
    ...TYPOGRAPHY.bodyLarge,
    color: '#777777',
  },


  signInButton: {
    marginLeft: 5,
  },


  signInButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: COLORS.accent,
  },


  pressed: {
    opacity: 0.6,
  },
});