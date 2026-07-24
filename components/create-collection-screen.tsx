import CollectionForm, {
    CollectionFormValues,
    getInitialCollectionFormValues,
} from '@/components/collection-form';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { Top3List } from '@/types/top3-list';
import {
    router,
    useLocalSearchParams,
} from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getInitialValuesForCategory(
  existingLists: Top3List[],
  requestedCategoryId?: string
): CollectionFormValues {
  if (!requestedCategoryId) {
    return getInitialCollectionFormValues(existingLists);
  }

  const category = TOP3_CATEGORIES.find(
    (item) => item.id === requestedCategoryId
  );

  if (!category) {
    return getInitialCollectionFormValues(existingLists);
  }

  const availableTopics = category.topics
    .filter((topic) => {
      const normalizedTopic =
        topic.id === 'general'
          ? ''
          : topic.name.trim().toLowerCase();

      return !existingLists.some((list) => {
        const existingTopic =
          list.topic?.trim().toLowerCase() ?? '';

        return (
          list.category.trim().toLowerCase() ===
            category.id.trim().toLowerCase() &&
          existingTopic === normalizedTopic
        );
      });
    })
    .sort((first, second) => {
      if (first.id === 'general') {
        return -1;
      }

      if (second.id === 'general') {
        return 1;
      }

      return first.name.localeCompare(second.name);
    });

  const firstTopic = availableTopics[0];

  if (!firstTopic) {
    return {
      categoryId: category.id,
      topicId: '',
      title: '',
    };
  }

  const title =
    firstTopic.id === 'general'
      ? `Top 3 ${category.name}`
      : `Top 3 ${firstTopic.name} ${category.name}`;

  return {
    categoryId: category.id,
    topicId: firstTopic.id,
    title,
  };
}

export default function CreateCollectionScreen() {
  const { categoryId } = useLocalSearchParams<{
    categoryId?: string;
  }>();

  const { createList, lists } = useTop3();

  const [formValues, setFormValues] =
    useState<CollectionFormValues>(() =>
      getInitialValuesForCategory(
        lists,
        categoryId
      )
    );

  const canCreate =
  Boolean(formValues.categoryId) &&
  Boolean(formValues.title);

  function createCollection() {
    if (!canCreate) {
      return;
    }

    const category = TOP3_CATEGORIES.find(
      (item) => item.id === formValues.categoryId
    );

    if (!category) {
      return;
    }

    const topic = formValues.topicId
  ? category.topics.find(
      (item) => item.id === formValues.topicId
    )?.name
  : undefined;

    const newListId = createList({
      category: formValues.categoryId,
      topic,
      title: formValues.title,
    });

    if (newListId === null) {
      Alert.alert(
        'Collection Already Exists',
        `You already have a ${formValues.title} collection.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Open Collection',
            onPress: () =>
              router.push('/collection'),
          },
        ]
      );

      return;
    }

    router.push('/collection');
  }

  return (
    <SafeAreaView
  style={styles.container}
  edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
            <View style={styles.introduction}>
  <Text style={styles.heading}>
    Share your taste
  </Text>

  <Text style={styles.description}>
    What would you like to rank today?
  </Text>
</View>
        <CollectionForm
          existingLists={lists}
          values={formValues}
          onChange={setFormValues}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Continue"
          onPress={createCollection}
          disabled={!canCreate}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
  introduction: {
  marginBottom: 24,
},

heading: {
  fontSize: 30,
  fontWeight: '700',
  color: '#222222',
},

description: {
  marginTop: 8,
  fontSize: 17,
  lineHeight: 24,
  color: '#666666',
},
});