import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import {
  TOP3_CATEGORIES,
  Top3Topic,
} from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { Top3List } from '@/types/top3-list';
import { buildCollectionTitle } from '@/utils/build-collection-title';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useRef,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


function normalizeValue(
  value?: string
) {
  const normalizedValue =
    value
      ?.trim()
      .toLowerCase() ?? '';


  return normalizedValue === 'general'
    ? ''
    : normalizedValue;
}


function findExistingCollection(
  lists: Top3List[],
  categoryId: string,
  topicName?: string
) {
  const normalizedCategoryId =
    normalizeValue(categoryId);


  const normalizedTopic =
    normalizeValue(topicName);


  const matchingCollections =
    lists.filter((list) => {
      return (
        normalizeValue(
          list.category
        ) === normalizedCategoryId &&
        normalizeValue(
          list.topic
        ) === normalizedTopic
      );
    });


  if (matchingCollections.length === 0) {
    return undefined;
  }


  const publishedCollection =
    matchingCollections.find(
      (list) =>
        Boolean(list.publishedAt)
    );


  if (publishedCollection) {
    return publishedCollection;
  }


  const populatedCollection =
    matchingCollections.find(
      (list) =>
        list.items.some(
          (item) => item !== null
        )
    );


  return (
    populatedCollection ??
    matchingCollections[0]
  );
}


function getSortedTopics(
  topics: Top3Topic[]
) {
  return topics
    .filter(
      (topic) =>
        topic.id !== 'general'
    )
    .sort((first, second) =>
      first.name.localeCompare(
        second.name
      )
    );
}


export default function CreateTopicScreen() {
  const params =
    useLocalSearchParams<{
      categoryId?: string | string[];
      topicId?: string | string[];
    }>();


  const categoryId =
    Array.isArray(params.categoryId)
      ? params.categoryId[0]
      : params.categoryId;


  const requestedTopicId =
    Array.isArray(params.topicId)
      ? params.topicId[0]
      : params.topicId;


  const {
    createList,
    lists,
    selectList,
  } = useTop3();


  const hasHandledRequestedTopic =
    useRef(false);


  const category =
    TOP3_CATEGORIES.find(
      (item) =>
        item.id === categoryId
    );


  if (!category) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}>
        <ScreenHeader showBackButton />


        <PageHeader
          title="Choose a category"
          subtitle="Select a category before choosing a topic."
        />


        <View style={styles.emptyState}>
          <Pressable
            style={({ pressed }) => [
              styles.returnButton,
              pressed &&
                styles.pressed,
            ]}
            onPress={() =>
              router.back()
            }
            accessibilityRole="button"
            accessibilityLabel="Return to categories">
            <Text
              style={
                styles.returnButtonText
              }>
              Choose a category
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  const selectedCategory = category;


  const topics =
    getSortedTopics(
      selectedCategory.topics
    );


  const overallCollection =
    findExistingCollection(
      lists,
      selectedCategory.id,
      undefined
    );


  const overallIsPublished =
    Boolean(
      overallCollection?.publishedAt
    );


  async function chooseCollection(
    topic?: Top3Topic
  ) {
    const topicName =
      topic?.name;


    const existingCollection =
      findExistingCollection(
        lists,
        selectedCategory.id,
        topicName
      );


    if (existingCollection) {
      selectList(
        existingCollection.id
      );


      router.push({
        pathname: '/collection',
        params: {
          listId:
            existingCollection.id,
        },
      });


      return;
    }


    const title =
      buildCollectionTitle(
        selectedCategory.id,
        topic?.id
      );


    const listId =
      await createList({
        category:
          selectedCategory.id,
        topic:
          topicName,
        title,
      });


    router.push({
      pathname: '/collection',
      params: {
        listId,
      },
    });
  }


  function chooseRequestedTopic() {
    if (!requestedTopicId) {
      return;
    }


    if (
      requestedTopicId === 'general'
    ) {
      chooseCollection();
      return;
    }


    const requestedTopic =
      topics.find(
        (topic) =>
          topic.id ===
          requestedTopicId
      );


    if (requestedTopic) {
      chooseCollection(
        requestedTopic
      );
    }
  }


  useEffect(() => {
    if (
      !requestedTopicId ||
      hasHandledRequestedTopic.current
    ) {
      return;
    }


    hasHandledRequestedTopic.current =
      true;


    chooseRequestedTopic();
  }, [
    requestedTopicId,
  ]);


  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />


      <PageHeader
        title={`${selectedCategory.icon} ${selectedCategory.name}`}
        subtitle="Rank them all, or choose a genre."
      />


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}>
        <Pressable
          style={({ pressed }) => [
            styles.overallCard,
            pressed &&
              styles.pressed,
          ]}
          onPress={() =>
            chooseCollection()
          }
          accessibilityRole="button"
          accessibilityLabel={
            overallIsPublished
              ? `Edit overall ${selectedCategory.name}`
              : `Rank overall ${selectedCategory.name}`
          }>
          <View
            style={
              styles.overallText
            }>
            <Text
              style={
                styles.overallTitle
              }>
              All {selectedCategory.name}
            </Text>


            <Text
              style={
                styles.overallSubtitle
              }>
              Rank your favourites across every genre.
            </Text>
          </View>


          <Ionicons
            name="chevron-forward"
            size={20}
            color="#777777"
          />
        </Pressable>


        {topics.length > 0 ? (
          <View style={styles.genreContainer}>
            <View
              style={styles.genreHeadingRow}>
              <Text
                style={styles.sectionLabel}>
                Choose a Genre
              </Text>

              <Text
                style={styles.optionalLabel}>
                {' '}(optional)
              </Text>
            </View>


            <View
              style={
                styles.topicGrid
              }>
              {topics.map(
                (topic) => {
                  const existingCollection =
                    findExistingCollection(
                      lists,
                      selectedCategory.id,
                      topic.name
                    );


                  const isPublished =
                    Boolean(
                      existingCollection?.publishedAt
                    );


                  return (
                    <View
                      key={topic.id}
                      style={
                        styles.topicCardWrapper
                      }>
                      <Pressable
                        style={({
                          pressed,
                        }) => [
                          styles.topicCard,
                          pressed &&
                            styles.pressed,
                        ]}
                        onPress={() =>
                          chooseCollection(
                            topic
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          isPublished
                            ? `Edit ${topic.name} ${selectedCategory.name}`
                            : `${topic.name} ${selectedCategory.name}`
                        }>
                        <Text
                          style={
                            styles.topicName
                          }>
                          {topic.name}
                        </Text>


                      </Pressable>
                    </View>
                  );
                }
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F8F8F8',
    },


    scrollView: {
      flex: 1,
      backgroundColor:
        '#F8F8F8',
    },


    content: {
      paddingHorizontal: 20,
      paddingTop: 0,
      paddingBottom: 40,
    },


    sectionLabel: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      color: '#222222',
    },


    genreContainer: {
      marginTop: 12,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 18,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EAEAEA',
      borderRadius: 16,
    },


    genreHeadingRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 14,
    },


    optionalLabel: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '400',
      color: '#888888',
    },


    overallCard: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 16,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor: '#EAEAEA',
      borderRadius: 16,
    },


    overallText: {
      flex: 1,
      minWidth: 0,
      marginRight: 12,
    },


    overallTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      color: '#222222',
    },


    overallSubtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 19,
      color: '#777777',
    },


    topicGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  columnGap: 12,
  rowGap: 12,
},


    topicCardWrapper: {
  width: '31%',
},


    topicCard: {
      minHeight: 54,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor:
        '#F8F8F8',
      borderWidth: 1,
      borderColor: '#E1E1E1',
      borderRadius: 14,
    },


    topicName: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: '#222222',
      textAlign: 'center',
    },


    pressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.985,
        },
      ],
    },


    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 24,
    },


    returnButton: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor:
        '#222222',
    },


    returnButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
