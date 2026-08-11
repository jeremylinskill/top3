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
import { buildCollectionTitle } from '@/utils/build-collection-title';
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
        return {
          categoryId: category.id,
          typeId: '',
          topicId: requestedTopic.id,
          title: buildCollectionTitle(
            category.id,
            requestedTopic.id
          ),
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
      typeId: '',
      topicId: '',
      title: '',
    };
  }

  return {
    categoryId: category.id,
    typeId: '',
    topicId: firstTopic.id,
    title: buildCollectionTitle(
      category.id,
      firstTopic.id
    ),
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

  const selectedCategory =
    TOP3_CATEGORIES.find(
      (item) =>
        item.id === formValues.categoryId
    );

  const requiresType =
    Boolean(
      selectedCategory?.types?.length
    );

  const canCreate =
    Boolean(formValues.categoryId) &&
    Boolean(formValues.title) &&
    (
      !requiresType ||
      Boolean(formValues.typeId)
    );

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

    const type = formValues.typeId
      ? category.types?.find(
          (item) => item.id === formValues.typeId
        )
      : undefined;

    const topics =
      type?.topics ??
      category.topics;

    const topic = formValues.topicId
      ? topics.find(
          (item) => item.id === formValues.topicId
        )?.name
      : undefined;

    createList({
      category: formValues.categoryId,
      type: type?.name,
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
      <ScreenHeader />

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