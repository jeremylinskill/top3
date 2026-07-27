import { Post } from '@/types/post';

type PersonalizedFeedPost = {
  post: Post;
  isSuggested: boolean;
  suggestionReason?: string;
};

type BuildPersonalizedFeedOptions = {
  posts: Post[];
  currentUserId: string;
  followedUserIds: string[];
};

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function getItemTitles(post: Post) {
  return post.collection.items
    .filter(Boolean)
    .map((item) =>
      normalizeValue(item?.title)
    )
    .filter(Boolean);
}

function getSuggestionScore(
  candidatePost: Post,
  currentUserPosts: Post[]
) {
  let score = 0;

  const candidateCategory = normalizeValue(
    candidatePost.collection.category
  );

  const candidateTopic = normalizeValue(
    candidatePost.collection.topic
  );

  const candidateItems = new Set(
    getItemTitles(candidatePost)
  );

  let categoryMatched = false;
  let topicMatched = false;
  let matchingItemTitle = '';

  currentUserPosts.forEach((userPost) => {
    const userCategory = normalizeValue(
      userPost.collection.category
    );

    const userTopic = normalizeValue(
      userPost.collection.topic
    );

    if (
      candidateCategory &&
      candidateCategory === userCategory
    ) {
      score += 3;
      categoryMatched = true;
    }

    if (
      candidateTopic &&
      candidateTopic !== 'general' &&
      candidateTopic === userTopic
    ) {
      score += 5;
      topicMatched = true;
    }

    getItemTitles(userPost).forEach(
      (itemTitle) => {
        if (candidateItems.has(itemTitle)) {
          score += 8;

          if (!matchingItemTitle) {
            const matchingItem =
              candidatePost.collection.items.find(
                (item) =>
                  normalizeValue(item?.title) ===
                  itemTitle
              );

            matchingItemTitle =
              matchingItem?.title ?? '';
          }
        }
      }
    );
  });

  let suggestionReason:
    | string
    | undefined;

  if (matchingItemTitle) {
    suggestionReason =
      `Suggested because you ranked ${matchingItemTitle}`;
  } else if (topicMatched) {
    suggestionReason =
      `Suggested because you rank ${candidatePost.collection.topic}`;
  } else if (categoryMatched) {
    suggestionReason =
      `Suggested because you rank ${candidatePost.collection.category}`;
  }

  return {
    score,
    suggestionReason,
  };
}

export function buildPersonalizedFeed({
  posts,
  currentUserId,
  followedUserIds,
}: BuildPersonalizedFeedOptions): PersonalizedFeedPost[] {
  const followedIds = new Set(
    followedUserIds
  );

  const currentUserPosts = posts.filter(
    (post) =>
      post.authorId === currentUserId
  );

  const priorityPosts = posts
    .filter(
      (post) =>
        post.authorId === currentUserId ||
        followedIds.has(post.authorId)
    )
    .sort(
      (first, second) =>
        new Date(
          second.publishedAt
        ).getTime() -
        new Date(
          first.publishedAt
        ).getTime()
    );

  const suggestionCandidates = posts
    .filter(
      (post) =>
        post.authorId !== currentUserId &&
        !followedIds.has(post.authorId)
    )
    .map((post) => {
      const {
        score,
        suggestionReason,
      } = getSuggestionScore(
        post,
        currentUserPosts
      );

      return {
        post,
        score,
        suggestionReason,
      };
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return (
        new Date(
          second.post.publishedAt
        ).getTime() -
        new Date(
          first.post.publishedAt
        ).getTime()
      );
    });

  const result: PersonalizedFeedPost[] =
    [];

  let priorityIndex = 0;
  let suggestionIndex = 0;

  while (
    priorityIndex < priorityPosts.length ||
    suggestionIndex <
      suggestionCandidates.length
  ) {
    for (
      let count = 0;
      count < 3 &&
      priorityIndex < priorityPosts.length;
      count += 1
    ) {
      result.push({
        post: priorityPosts[priorityIndex],
        isSuggested: false,
      });

      priorityIndex += 1;
    }

    if (
      suggestionIndex <
      suggestionCandidates.length
    ) {
      const suggestion =
        suggestionCandidates[
          suggestionIndex
        ];

      result.push({
        post: suggestion.post,
        isSuggested: true,
        suggestionReason:
          suggestion.suggestionReason ??
          'Suggested for you',
      });

      suggestionIndex += 1;
    }

    if (
      priorityIndex >= priorityPosts.length
    ) {
      while (
        suggestionIndex <
        suggestionCandidates.length
      ) {
        const suggestion =
          suggestionCandidates[
            suggestionIndex
          ];

        result.push({
          post: suggestion.post,
          isSuggested: true,
          suggestionReason:
            suggestion.suggestionReason ??
            'Suggested for you',
        });

        suggestionIndex += 1;
      }
    }
  }

  return result;
}