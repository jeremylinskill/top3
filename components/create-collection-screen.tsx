import PageHeader from '@/components/page-header';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import {
  CategoryId,
  TOP3_CATEGORIES,
} from '@/constants/top3-categories';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { useDmHeaderAction } from '@/hooks/use-dm-header-action';
import Reanimated from 'react-native-reanimated';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_ORDER: CategoryId[] = [
  'albums',
  'artists',
  'books',
  'movies',
  'podcasts',
  'songs',
  'tv',
  'games',
];

export default function CreateCollectionScreen({
  requestUserId,
}: {
  requestUserId?: string;
} = {}) {
  const isRequestMode = Boolean(requestUserId);
  const dmHeaderAction = useDmHeaderAction();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);

  // Create has no custom bottom-bar scroll contract or floating icon actions.
  // Reuse the approved UI-thread header gesture without changing those systems.
  const ignoreCreateTabScroll = useCallback((_y: number) => {}, []);
  const ignoreCreateActionState = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler: stickyScrollHandler, headerStyle: stickyHeaderStyle } =
    useHomeStickyHeader(ignoreCreateTabScroll, ignoreCreateActionState);

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
          ...(isRequestMode ? { requestUserId } : {}),
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
      edges={['left', 'right']}>
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
        <ScreenHeader showBackButton={isRequestMode} overlay featheredBackdrop androidStatusBarGlass {...(!isRequestMode ? dmHeaderAction : {})} />
      </Reanimated.View>

      <Reanimated.ScrollView
        style={[
          styles.scrollView,
          {
            backgroundColor:
              colors.background,
          },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Overlay header no longer consumes layout space. Preserve
            // the original title and category-card starting positions.
            paddingTop: SCREEN_HEADER_HEIGHT + insets.top,
          },
          scrollViewportHeight > 0 && {
            minHeight: scrollViewportHeight + 128,
          },
        ]}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          if (height > 0 && height !== scrollViewportHeight) {
            setScrollViewportHeight(height);
          }
        }}
        showsVerticalScrollIndicator={false}
        onScroll={stickyScrollHandler}
        scrollEventThrottle={16}>
        <PageHeader
          title={isRequestMode ? 'Request a Top 3' : 'Create a Top 3'}
          subtitle={isRequestMode ? 'What would you like them to rank?' : 'What would you like to rank?'}
        />

        <View style={styles.content}>
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
                        `${isRequestMode ? 'Request' : 'Create'} a Top 3 ${category.name} list`
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
        </View>
      </Reanimated.ScrollView>
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

  scrollContent: {
    paddingBottom: 36,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
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
