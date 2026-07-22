import CollectionForm, {
    CollectionFormValues,
    getInitialCollectionFormValues,
} from '@/components/collection-form';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateCollectionScreen() {
  const { createList, lists } = useTop3();

  const [formValues, setFormValues] =
    useState<CollectionFormValues>(() =>
      getInitialCollectionFormValues(lists)
    );

  const canCreate =
    Boolean(formValues.categoryId) &&
    Boolean(formValues.topicId) &&
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

    const topic =
      formValues.topicId === 'general'
        ? undefined
        : category.topics.find(
            (item) => item.id === formValues.topicId
          )?.name;

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
            onPress: () => router.replace('/collection'),
          },
        ]
      );

      return;
    }

    router.replace('/collection');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Create Collection"
        subtitle="Choose a category and topic for your new collection."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <CollectionForm
          existingLists={lists}
          values={formValues}
          onChange={setFormValues}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Create Collection"
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
    paddingTop: 12,
    paddingBottom: 24,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});