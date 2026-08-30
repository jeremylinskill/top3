import Chip from '@/components/chip';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { TYPOGRAPHY } from '@/constants/typography';
import { Top3List } from '@/types/top3-list';
import { buildCollectionTitle } from '@/utils/build-collection-title';
import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type CollectionFormValues = {
  categoryId: string;
  typeId: string;
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

function getAvailableTopics(
  categoryId: string,
  typeId: string
) {
  const category = SORTED_CATEGORIES.find(
    (item) => item.id === categoryId
  );

  if (!category) {
    return [];
  }

  const type =
    category.types?.find(
      (item) => item.id === typeId
    );

  const topics =
    type?.topics ??
    category.topics;

  return topics
    .filter(
      (topic) =>
        topic.id !== 'general'
    )
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
      typeId: '',
      topicId: '',
      title: '',
    };
  }

  return {
    categoryId: firstCategory.id,
    typeId: '',
    topicId: '',
    title: buildCollectionTitle(
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
  const selectedCategory =
    SORTED_CATEGORIES.find(
      (category) =>
        category.id === values.categoryId
    );

  const availableTypes =
    selectedCategory?.types ?? [];

  const hasTypes =
    availableTypes.length > 0;

  const availableTopics = useMemo(
    () =>
      getAvailableTopics(
        values.categoryId,
        values.typeId
      ),
    [
      values.categoryId,
      values.typeId,
    ]
  );

  function chooseCategory(
    nextCategoryId: string
  ) {
    onChange({
      categoryId: nextCategoryId,
      typeId: '',
      topicId: '',
      title: buildCollectionTitle(
        nextCategoryId,
        ''
      ),
    });
  }

  function chooseType(
    nextTypeId: string
  ) {
    const shouldClearType =
      values.typeId === nextTypeId;

    const updatedTypeId =
      shouldClearType
        ? ''
        : nextTypeId;

    onChange({
      categoryId: values.categoryId,
      typeId: updatedTypeId,
      topicId: '',
      title: buildCollectionTitle(
        values.categoryId,
        updatedTypeId
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
      typeId: values.typeId,
      topicId: updatedTopicId,
      title: hasTypes
        ? buildCollectionTitle(
            values.categoryId,
            values.typeId,
            updatedTopicId
          )
        : buildCollectionTitle(
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

      {hasTypes ? (
        <View style={styles.typeSection}>
          <Text style={styles.sectionTitle}>
            Type
          </Text>

          <View style={styles.optionGroup}>
            {availableTypes.map(
              (type) => {
                const isSelected =
                  type.id === values.typeId;

                return (
                  <Chip
                    key={type.id}
                    label={type.name}
                    selected={isSelected}
                    onPress={() =>
                      chooseType(type.id)
                    }
                  />
                );
              }
            )}
          </View>
        </View>
      ) : null}

      {(!hasTypes || values.typeId) ? (
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
                No topics are available in this category.
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 12,
  },

  optionalLabel: {
    fontWeight: '400',
    color: '#777777',
  },

  typeSection: {
    marginTop: 30,
  },

  topicSection: {
    marginTop: 30,
  },

  topicHelper: {
    ...TYPOGRAPHY.body,
    marginTop: -4,
    marginBottom: 14,
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
    ...TYPOGRAPHY.body,
    color: '#777777',
    textAlign: 'center',
  },
});