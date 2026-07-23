import ScreenHeader from '@/components/screen-header';
import { useProfile } from '@/context/profile-context';
import { getFeedPosts, getMockUserById } from '@/services/post-service';
import { formatRelativeTime } from '@/utils/format-relative-time';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublishedTop3Screen() {
  const { postId } = useLocalSearchParams<{
    postId?: string;
  }>();

  const { profile } = useProfile();

  const allPosts = getFeedPosts([]);

  const post =
    allPosts.find((item) => item.id === postId) ?? null;

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Top 3 Not Found"
          showBackButton
        />

        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>
            This Top 3 is unavailable
          </Text>

          <Text style={styles.messageText}>
            It may have been removed or is no longer available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const author =
    post.authorId === profile.id
      ? profile
      : getMockUserById(post.authorId);

  const publishedText = formatRelativeTime(
    post.publishedAt
  )?.replace(/^Updated\s+/i, '');

  function openAuthorProfile() {
  if (post.authorId === profile.id) {
    router.push('/(tabs)/profile');
    return;
  }

  Alert.alert(
    'Public profile coming next',
    'We’ll build the read-only profile screen for other users next.'
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={post.collection.title}
        subtitle={
          publishedText
            ? `Published ${publishedText}`
            : 'Published'
        }
        showBackButton
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {author ? (
          <Pressable
            style={styles.authorRow}
            onPress={openAuthorProfile}
            accessibilityRole="button"
            accessibilityLabel={`Open ${author.displayName}'s profile`}>
            <View style={styles.avatar}>
              {author.avatarUrl ? (
                <Image
                  source={{ uri: author.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {author.displayName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>
                {author.displayName}
              </Text>

              <Text style={styles.username}>
                @{author.username}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ) : null}

        <View style={styles.rankingCard}>
          {post.collection.items.map((item, index) => (
            <View
              key={`${post.id}-${index}`}
              style={[
                styles.rankRow,
                index < 2 && styles.rankRowBorder,
              ]}>
              <Text style={styles.rankNumber}>
                {index + 1}
              </Text>

              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>
                  {item?.title ?? 'Not selected'}
                </Text>

                {item?.subtitle ? (
                  <Text style={styles.itemSubtitle}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.socialRow}>
          <View style={styles.socialStat}>
            <Text style={styles.socialValue}>
              {post.reactions}
            </Text>

            <Text style={styles.socialLabel}>
              Reactions
            </Text>
          </View>

          <View style={styles.socialDivider} />

          <View style={styles.socialStat}>
            <Text style={styles.socialValue}>
              {post.comments}
            </Text>

            <Text style={styles.socialLabel}>
              Comments
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  authorDetails: {
    flex: 1,
    marginLeft: 12,
  },

  authorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 2,
    fontSize: 14,
    color: '#777777',
  },

  arrow: {
    fontSize: 30,
    color: '#999999',
  },

  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    paddingHorizontal: 18,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 20,
  },

  rankRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },

  rankNumber: {
    width: 38,
    fontSize: 28,
    fontWeight: '700',
    color: '#222222',
  },

  itemDetails: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '600',
    color: '#222222',
  },

  itemSubtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
  },

  socialRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    paddingVertical: 18,
  },

  socialStat: {
    flex: 1,
    alignItems: 'center',
  },

  socialValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  socialLabel: {
    marginTop: 4,
    fontSize: 14,
    color: '#777777',
  },

  socialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: '#DDDDDD',
  },

  messageContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  messageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },

  messageText: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#777777',
    textAlign: 'center',
  },
});