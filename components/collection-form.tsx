import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3List } from '@/types/top3-list';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type CollectionFormValues = {
  categoryId: string;
  topicId: string;
  title: string;
};

type CollectionFormProps = {
  existingLists: Top3List[];
  onSubmit: (values: CollectionFormValues) => void;
};

export default function CollectionForm({
  existingLists,
  onSubmit,
}: CollectionFormProps) {
  const firstCategory = TOP3_CATEGORIES[0];
  const [categoryId, setCategoryId] = useState(firstCategory.id);

  const selectedCategory =
    TOP3_CATEGORIES.find((category) => category.id === categoryId) ??
    firstCategory;

  const availableTopics = useMemo(() => {
    return selectedCategory.topics.filter((topic) => {
      const normalizedTopic =
        topic.id === 'general' ? '' : topic.name.trim().toLowerCase();

      return !existingLists.some((list) => {
        const existingTopic = list.topic?.trim().toLowerCase() ?? '';

        return (
          list.category.toLowerCase() === selectedCategory.id.toLowerCase() &&
          existingTopic === normalizedTopic
        );
      });
    });
  }, [existingLists, selectedCategory]);

  const [topicId, setTopicId] = useState(availableTopics[0]?.id ?? '');

  const selectedTopic =
    availableTopics.find((topic) => topic.id === topicId) ??
    availableTopics[0];

  const title = selectedTopic
    ? selectedTopic.id === 'general'
      ? `Top 3 ${selectedCategory.name}`
      : `Top 3 ${selectedTopic.name} ${selectedCategory.name}`
    : '';

  function chooseCategory(nextCategoryId: string) {
    const nextCategory =
      TOP3_CATEGORIES.find(
        (category) => category.id === nextCategoryId
      ) ?? firstCategory;

    const nextAvailableTopics = nextCategory.topics.filter((topic) => {
      const normalizedTopic =
        topic.id === 'general' ? '' : topic.name.trim().toLowerCase();

      return !existingLists.some((list) => {
        const existingTopic = list.topic?.trim().toLowerCase() ?? '';

        return (
          list.category.toLowerCase() === nextCategory.id.toLowerCase() &&
          existingTopic === normalizedTopic
        );
      });
    });

    setCategoryId(nextCategory.id);
    setTopicId(nextAvailableTopics[0]?.id ?? '');
  }

  return (
    <View>
      <Text style={styles.label}>Category</Text>

      <View style={styles.optionGroup}>
        {TOP3_CATEGORIES.map((category) => {
          const isSelected = category.id === categoryId;

          return (
            <Pressable
              key={category.id}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => chooseCategory(category.id)}>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}>
                {category.icon} {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Available topics</Text>

      {availableTopics.length > 0 ? (
        <>
          <View style={styles.optionGroup}>
            {availableTopics.map((topic) => {
              const isSelected = topic.id === topicId;

              return (
                <Pressable
                  key={topic.id}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => setTopicId(topic.id)}>
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}>
                    {topic.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.submitButton}
            onPress={() => {
              if (!selectedTopic) {
                return;
              }

              onSubmit({
                categoryId,
                topicId: selectedTopic.id,
                title,
              });
            }}>
            <Text style={styles.submitButtonText}>Create {title}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.emptyMessage}>
          You’ve created all available collections in this category.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: '#222222',
    backgroundColor: '#222222',
  },
  optionText: {
    fontSize: 16,
    color: '#222222',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 16,
    color: '#777777',
    lineHeight: 22,
  },
  submitButton: {
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#222222',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});