import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import Top3Card from '@/components/top3-card';
import { useProfile } from '@/context/profile-context';
import { useTop3 } from '@/context/top3-context';
import { Post } from '@/types/post';
import { router } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { profile } = useProfile();

  const {
    posts,
    selectList,
  } = useTop3();

  const publishedPosts = [...posts]
    .filter(
      (post) => post.authorId === profile.id
    )
    .sort(
      (first, second) =>
        new Date(second.publishedAt).getTime() -
        new Date(first.publishedAt).getTime()
    );

  function openCollection(post: Post) {
    selectList(post.collection.id);
    router.push('/collection');
  }

  return (
    <SafeAreaView
  style={styles.container}
  edges={['top', 'left', 'right']}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.identitySection}>
          <View style={styles.avatar}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {profile.displayName
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.identityDetails}>
            <Text style={styles.displayName}>
              {profile.displayName}
            </Text>

            <Text style={styles.username}>
              @{profile.username}
            </Text>

            {profile.bio ? (
              <Text
                style={styles.bio}
                numberOfLines={3}>
                {profile.bio}
              </Text>
            ) : (
              <Text
                style={styles.emptyBio}
                numberOfLines={2}>
                Add a bio to tell people about your taste.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {publishedPosts.length}
            </Text>

            <Text style={styles.statLabel}>
              Top 3s
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              0
            </Text>

            <Text style={styles.statLabel}>
              Followers
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              0
            </Text>

            <Text style={styles.statLabel}>
              Following
            </Text>
          </View>
        </View>

        <View style={styles.profileAction}>
          <PrimaryButton
            title="Edit Profile"
            onPress={() =>
              router.push('/edit-profile')
            }
          />
        </View>

        <View style={styles.section}>
        

          {publishedPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                Nothing published yet
              </Text>

              <Text style={styles.emptyStateText}>
                Complete and publish a Top 3 to show it on
                your profile.
              </Text>
            </View>
          ) : (
            <View style={styles.postList}>
              {publishedPosts.map((post) => (
                <Top3Card
                  key={post.id}
                  post={post}
                  author={profile}
                  showAuthor={false}
                  onPress={() =>
                    openCollection(post)
                  }
                />
              ))}
            </View>
          )}
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

  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    fontSize: 30,
    fontWeight: '700',
  },

  identityDetails: {
    flex: 1,
    marginLeft: 16,
  },

  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222222',
  },

  username: {
    marginTop: 2,
    fontSize: 16,
    color: '#777777',
  },

  bio: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#555555',
  },

  emptyBio: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#999999',
  },

  statsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 16,
    paddingVertical: 16,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  statLabel: {
    marginTop: 3,
    fontSize: 13,
    color: '#777777',
  },

  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: '#DDDDDD',
  },

  profileAction: {
    marginTop: 14,
  },

  section: {
    marginTop: 20,
  },

  sectionTitle: {
    marginBottom: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
  },

  postList: {
    gap: 16,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222222',
  },

  emptyStateText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
  },
});