import CollectionForm from '@/components/collection-form';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateCollectionScreen() {
  const { createList, lists } = useTop3();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create Topic Collection</Text>

        <Text style={styles.subtitle}>
          Choose a category and topic to create a specialized Top 3
          collection.
        </Text>

        <CollectionForm
          existingLists={lists}
          onSubmit={({ categoryId, topicId, title }) => {
            const category = TOP3_CATEGORIES.find(
              (item) => item.id === categoryId
            );

            if (!category) {
              return;
            }

            const topic =
              topicId === 'general'
                ? undefined
                : category.topics.find(
                    (item) => item.id === topicId
                  )?.name;

            const newListId = createList({
              category: categoryId,
              topic,
              title,
            });

            if (newListId === null) {
              Alert.alert(
                'Collection Already Exists',
                `You already have a ${title} collection.`,
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
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 24,
  },
});