import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3List } from '@/types/top3-list';
import { useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export type CollectionFormValues = {
  categoryId: string;
  topicId: string;
  title: string;
};

type CollectionFormProps = {
  existingLists: Top3List[];
  values: CollectionFormValues;
  onChange: (values: CollectionFormValues) => void;
};

const SORTED_CATEGORIES = [...TOP3_CATEGORIES].sort(
  (first, second) =>
    first.name.localeCompare(second.name)
);

function getAvailableTopics(
  categoryId: string,
  existingLists: Top3List[]
) {
  const category = SORTED_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  if (!category) {
    return [];
  }

  return category.topics
    .filter((topic) => {
      const normalizedTopic =
        topic.id === 'general'
          ? ''
          : topic.name.trim().toLowerCase();

      return !existingLists.some((list) => {
        const existingTopic =
          list.topic?.trim().toLowerCase() ?? '';

        return (
          list.category.toLowerCase() ===
            category.id.toLowerCase() &&
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
}

function buildTitle(
  categoryId: string,
  topicId: string
) {
  const category = SORTED_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  const topic = category?.topics.find(
    (item) => item.id === topicId
  );

  if (!category || !topic) {
    return '';
  }

  return topic.id === 'general'
    ? `Top 3 ${category.name}`
    : `Top 3 ${topic.name} ${category.name}`;
}

export function getInitialCollectionFormValues(
  existingLists: Top3List[]
): CollectionFormValues {
  const firstCategory = SORTED_CATEGORIES[0];

  if (!firstCategory) {
    return {
      categoryId: '',
      topicId: '',
      title: '',
    };
  }

  const firstTopic = getAvailableTopics(
    firstCategory.id,
    existingLists
  )[0];

  return {
    categoryId: firstCategory.id,
    topicId: firstTopic?.id ?? '',
    title: firstTopic
      ? buildTitle(firstCategory.id, firstTopic.id)
      : '',
  };
}

export default function CollectionForm({
  existingLists,
  values,
  onChange,
}: CollectionFormProps) {
  const availableTopics = useMemo(
    () =>
      getAvailableTopics(
        values.categoryId,
        existingLists
      ),
    [existingLists, values.categoryId]
  );

  function chooseCategory(nextCategoryId: string) {
    const nextTopic = getAvailableTopics(
      nextCategoryId,
      existingLists
    )[0];

    const nextTopicId = nextTopic?.id ?? '';

    onChange({
      categoryId: nextCategoryId,
      topicId: nextTopicId,
      title: nextTopic
        ? buildTitle(nextCategoryId, nextTopicId)
        : '',
    });
  }

  function chooseTopic(nextTopicId: string) {
    onChange({
      categoryId: values.categoryId,
      topicId: nextTopicId,
      title: buildTitle(
        values.categoryId,
        nextTopicId
      ),
    });
  }

  return (
    <View>
      <Text style={styles.label}>Category</Text>

      <View style={styles.optionGroup}>
        {SORTED_CATEGORIES.map((category) => {
          const isSelected =
            category.id === values.categoryId;

          return (
            <Pressable
              key={category.id}
              style={[
                styles.optionButton,
                isSelected &&
                  styles.optionButtonSelected,
              ]}
              onPress={() =>
                chooseCategory(category.id)
              }>
              <Text
                style={[
                  styles.optionText,
                  isSelected &&
                    styles.optionTextSelected,
                ]}>
                {category.icon} {category.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Available topics</Text>

      {availableTopics.length > 0 ? (
        <View style={styles.optionGroup}>
          {availableTopics.map((topic) => {
            const isSelected =
              topic.id === values.topicId;

            const displayName =
              topic.id === 'general'
                ? 'All'
                : topic.name;

            return (
              <Pressable
                key={topic.id}
                style={[
                  styles.optionButton,
                  isSelected &&
                    styles.optionButtonSelected,
                ]}
                onPress={() =>
                  chooseTopic(topic.id)
                }>
                <Text
                  style={[
                    styles.optionText,
                    isSelected &&
                      styles.optionTextSelected,
                  ]}>
                  {displayName}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
});