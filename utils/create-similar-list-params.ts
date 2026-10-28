import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import type { Top3List } from '@/types/top3-list';

// CREATE_YOURS_FEED_ACTION_20261025
// Pass taxonomy identifiers, never another person's three ranked items.
// The existing Create route resumes an owned matching list or starts with
// empty positions. Invalid or retired options remain on the choice screen.
export type CreateSimilarListParams = {
  categoryId: string;
  mode?: 'type' | 'theme';
  topicId?: string;
  themeSlug?: string;
  typeOptionId?: string;
};

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

export function getCreateSimilarListParams(list: Top3List): CreateSimilarListParams {
  const categoryId = list.category;
  const base = { categoryId };

  if (list.type?.trim()) {
    return {
      ...base,
      mode: 'type',
      typeOptionId: list.collectionOptionId || list.type,
    };
  }

  if (list.themeId?.trim()) {
    return {
      ...base,
      mode: 'theme',
      themeSlug: list.themeId,
    };
  }

  const category = TOP3_CATEGORIES.find((option) => option.id === categoryId);
  const topic = category?.topics.find(
    (option) =>
      normalize(option.id) === normalize(list.topic) ||
      normalize(option.name) === normalize(list.topic)
  );
  if (topic) {
    return { ...base, topicId: topic.id };
  }

  // Older Theme lists can have an option id but no separate themeId.
  if (list.collectionOptionId?.trim()) {
    return {
      ...base,
      mode: 'theme',
      themeSlug: list.collectionOptionId,
    };
  }

  // An unknown legacy topic must not silently become an Overall list.
  if (list.topic?.trim() && normalize(list.topic) !== 'general') {
    return { ...base, mode: 'type' };
  }

  return { ...base, topicId: 'general' };
}

// UNIFIED_CREATE_EDIT_CARD_ACTION_20261025
// Compare taxonomy, never another person's ranked choices. Lists in this
// array belong to the signed-in user and include unpublished drafts.
export function findMatchingOwnedList(
  ownedLists: Top3List[],
  source: Top3List
): Top3List | undefined {
  const tidy = (value?: string) => normalize(value).replace(/^general$/, '');
  const matches = ownedLists.filter((own) => {
    if (normalize(own.category) !== normalize(source.category)) return false;

    const ownType = tidy(own.type);
    const sourceType = tidy(source.type);
    // An older Album Soundtrack genre is the same list as the newer Type.
    if (normalize(source.category) === 'albums' && (
      (sourceType === 'soundtracks' && !ownType && tidy(own.topic) === 'soundtrack') ||
      (ownType === 'soundtracks' && !sourceType && tidy(source.topic) === 'soundtrack')
    )) return true;
    if (ownType || sourceType) {
      if (!ownType || !sourceType) return false;
      // An option identity is more reliable than display text when available.
      if (own.collectionOptionId && source.collectionOptionId) {
        return normalize(own.collectionOptionId) === normalize(source.collectionOptionId);
      }
      return ownType === sourceType;
    }

    const ownThemeId = tidy(own.themeId);
    const sourceThemeId = tidy(source.themeId);
    if (ownThemeId && sourceThemeId) return ownThemeId === sourceThemeId;

    if (own.collectionOptionId && source.collectionOptionId) {
      return normalize(own.collectionOptionId) === normalize(source.collectionOptionId);
    }

    const ownTopic = tidy(own.topic);
    const sourceTopic = tidy(source.topic);
    if (ownTopic || sourceTopic) {
      return Boolean(ownTopic && sourceTopic && ownTopic === sourceTopic);
    }
    // Overall lists only: themes without a topic cannot become Overall.
    return !ownThemeId && !sourceThemeId &&
      !own.collectionOptionId && !source.collectionOptionId;
  });

  // Match Create's existing preference: published first, then populated draft.
  return matches.find((list) => Boolean(list.publishedAt)) ??
    matches.find((list) => list.items.some((item) => item !== null)) ??
    matches[0];
}
