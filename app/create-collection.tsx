import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useTop3 } from '@/context/top3-context';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateCollectionScreen() {
  const { createList } = useTop3();

  function createCollection(
    categoryId: string,
    categoryName: string,
    topicId: string,
    topicName: string
  ) {
    const isGeneral = topicId === 'general';

    createList({
      category: categoryId,
      topic: isGeneral ? undefined : topicName,
      title: isGeneral
        ? `Top 3 ${categoryName}`
        : `Top 3 ${topicName} ${categoryName}`,
    });

    router.replace('/movies');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Collection</Text>

      <Text style={styles.subtitle}>
        Choose the kind of Top 3 you want to create.
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {TOP3_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {category.icon} {category.name}
            </Text>

            {category.topics.map((topic) => (
              <Pressable
                key={topic.id}
                style={styles.optionCard}
                onPress={() =>
                  createCollection(
                    category.id,
                    category.name,
                    topic.id,
                    topic.name
                  )
                }>
                <Text style={styles.optionTitle}>
                  {topic.id === 'general'
                    ? `Top 3 ${category.name}`
                    : `Top 3 ${topic.name} ${category.name}`}
                </Text>

                <Text style={styles.optionSubtitle}>
                  {topic.id === 'general'
                    ? `Your overall favorite ${category.name.toLowerCase()}`
                    : `Your favorite ${topic.name.toLowerCase()} ${category.name.toLowerCase()}`}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 24,
  },
  content: {
    paddingBottom: 32,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 20,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 15,
    color: '#777777',
    marginTop: 6,
  },
});