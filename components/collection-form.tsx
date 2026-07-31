import Chip from '@/components/chip';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { Top3List } from '@/types/top3-list';
import { useMemo } from 'react';
import {
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
  onChange: (
    values: CollectionFormValues
  ) => void;
};

const SORTED_CATEGORIES = [
  ...TOP3_CATEGORIES,
].sort((first, second) =>
  first.name.localeCompare(second.name)
);

function buildTitle(
  categoryId: string,
  topicId: string
) {
  const category = SORTED_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  if (!category) {
    return '';
  }

  if (!topicId) {
    return `Top 3 ${category.name}`;
  }

  const topic = category.topics.find(
    (item) => item.id === topicId
  );

  if (!topic || topic.id === 'general') {
    return `Top 3 ${category.name}`;
  }

  return `Top 3 ${topic.name} ${category.name}`;
}

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
      if (topic.id === 'general') {
        return false;
      }

      const normalizedTopic =
        topic.name.trim().toLowerCase();

      return !existingLists.some((list) => {
        const existingTopic =
          list.topic
            ?.trim()
            .toLowerCase() ?? '';

        return (
          list.category
            .trim()
            .toLowerCase() ===
            category.id
              .trim()
              .toLowerCase() &&
          existingTopic === normalizedTopic
        );
      });
    })
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    );
}

export function getInitialCollectionFormValues(
  existingLists: Top3List[]
): CollectionFormValues {
  const firstCategory =
    SORTED_CATEGORIES[0];

  if (!firstCategory) {
    return {
      categoryId: '',
      topicId: '',
      title: '',
    };
  }

  return {
    categoryId: firstCategory.id,
    topicId: '',
    title: buildTitle(
      firstCategory.id,
      ''
    ),
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
    [
      existingLists,
      values.categoryId,
    ]
  );

  function chooseCategory(
    nextCategoryId: string
  ) {
    onChange({
      categoryId: nextCategoryId,
      topicId: '',
      title: buildTitle(
        nextCategoryId,
        ''
      ),
    });
  }

  function chooseTopic(
    nextTopicId: string
  ) {
    const shouldClearTopic =
      values.topicId === nextTopicId;

    const updatedTopicId =
      shouldClearTopic
        ? ''
        : nextTopicId;

    onChange({
      categoryId: values.categoryId,
      topicId: updatedTopicId,
      title: buildTitle(
        values.categoryId,
        updatedTopicId
      ),
    });
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>
        Category
      </Text>

      <View style={styles.optionGroup}>
        {SORTED_CATEGORIES.map(
          (category) => {
            const isSelected =
              category.id ===
              values.categoryId;

            return (
              <Chip
                key={category.id}
                icon={category.icon}
                label={category.name}
                selected={isSelected}
                onPress={() =>
                  chooseCategory(category.id)
                }
              />
            );
          }
        )}
      </View>

      <View style={styles.topicSection}>
        <Text style={styles.sectionTitle}>
          Topic{' '}
          <Text style={styles.optionalLabel}>
            (optional)
          </Text>
        </Text>

        <Text style={styles.topicHelper}>
          Want to get more specific? Choose a
          topic.
        </Text>

        {availableTopics.length > 0 ? (
          <View style={styles.optionGroup}>
            {availableTopics.map(
              (topic) => {
                const isSelected =
                  topic.id ===
                  values.topicId;

                return (
                  <Chip
                    key={topic.id}
                    label={topic.name}
                    selected={isSelected}
                    onPress={() =>
                      chooseTopic(topic.id)
                    }
                  />
                );
              }
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMessage}>
              You’ve created all available topic
              collections in this category.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#222222',
  },

  optionalLabel: {
    fontWeight: '400',
    color: '#777777',
  },

  topicSection: {
    marginTop: 30,
  },

  topicHelper: {
    marginTop: -4,
    marginBottom: 14,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
  },

  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  emptyState: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 18,
  },

  emptyMessage: {
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },
});