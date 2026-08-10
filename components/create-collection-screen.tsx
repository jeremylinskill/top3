import CollectionForm, {
  CollectionFormValues,
  getInitialCollectionFormValues,
} from '@/components/collection-form';
import PageHeader from '@/components/page-header';
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
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function collectionAlreadyExists(
  existingLists: Top3List[],
  categoryId: string,
  topicName?: string
) {
  const normalizedCategoryId =
    normalizeValue(categoryId);

  const normalizedTopic =
    normalizeValue(topicName);

  return existingLists.some((list) => {
    return (
      Boolean(list.publishedAt) &&
      normalizeValue(list.category) === normalizedCategoryId &&
      normalizeValue(list.topic) === normalizedTopic
    );
  });
}

function getInitialValuesForCategory(
  existingLists: Top3List[],
  requestedCategoryId?: string,
  requestedTopicId?: string
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

  if (requestedTopicId) {
    const requestedTopic = category.topics.find(
      (topic) => topic.id === requestedTopicId
    );

    if (requestedTopic) {
      const topicName =
        requestedTopic.id === 'general'
          ? undefined
          : requestedTopic.name;

      const alreadyExists = collectionAlreadyExists(
        existingLists,
        category.id,
        topicName
      );

      if (!alreadyExists) {
        const title =
          requestedTopic.id === 'general'
            ? `Top 3 ${category.name}`
            : `Top 3 ${requestedTopic.name} ${category.name}`;

        return {
          categoryId: category.id,
          topicId: requestedTopic.id,
          title,
        };
      }
    }
  }

  const availableTopics = category.topics
    .filter((topic) => {
      const topicName =
        topic.id === 'general'
          ? undefined
          : topic.name;

      return !collectionAlreadyExists(
        existingLists,
        category.id,
        topicName
      );
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
  const params =
    useLocalSearchParams<{
      categoryId?: string | string[];
      topicId?: string | string[];
    }>();

  const categoryId = Array.isArray(params.categoryId)
    ? params.categoryId[0]
    : params.categoryId;

  const topicId = Array.isArray(params.topicId)
    ? params.topicId[0]
    : params.topicId;

  const { createList, lists } = useTop3();

  const [formValues, setFormValues] =
    useState(() =>
      getInitialValuesForCategory(
        lists,
        categoryId,
        topicId
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

    createList({
      category: formValues.categoryId,
      topic:
        formValues.topicId === 'general'
          ? undefined
          : topic,
      title: formValues.title,
    });

    router.push('/collection');
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Share your favorites"
        subtitle="What would you like to rank today?"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
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
    backgroundColor: '#F8F8F8',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8F8F8',
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: '#EAEAEA',
  },
});