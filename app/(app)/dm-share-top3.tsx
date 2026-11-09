import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED, GROUP_DM_ENABLED } from '@/lib/dm-availability';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  getDmSharedCollectionPreviews,
  listDmShareRecipientIds,
  shareDmCollection,
} from '@/lib/supabase/direct-messages';
import {
  listGroupConversations, listMyGroupMemberships, shareGroupCollection,
  type GroupConversation,
} from '@/lib/supabase/group-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@/types/user-profile';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DmShareTop3Screen() {
  const colors = useAppColors();
  const { user } = useAuth();
  const { collectionId: rawCollectionId } = useLocalSearchParams<{
    collectionId?: string | string[];
  }>();
  const collectionId = typeof rawCollectionId === 'string' ? rawCollectionId : '';
  const [title, setTitle] = useState('');
  const [recipients, setRecipients] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const currentUserId = user?.id ?? '';
    if (!DM_NAV_ENABLED || !currentUserId || !collectionId) {
      setLoading(false);
      setError('Sharing in Top 3 is not available.');
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    setGroupsError(null);
    setGroups([]);
    void (async () => {
      try {
        const [previews, recipientIds] = await Promise.all([
          getDmSharedCollectionPreviews([collectionId]),
          listDmShareRecipientIds(),
        ]);
        if (!previews[collectionId]) throw new Error('This published Top 3 is unavailable.');
        const profiles = recipientIds.length ? await getProfilesByIds(recipientIds) : [];
        if (!active) return;
        const byId = new Map(profiles.map((p) => [p.id, p]));
        setTitle(previews[collectionId].title);
        setRecipients(recipientIds.map((id) => byId.get(id)).filter(
          (value): value is UserProfile => Boolean(value)
        ));
        if (GROUP_DM_ENABLED) {
          try {
            const memberships = await listMyGroupMemberships(currentUserId);
            const ids = memberships.filter((member) => member.status === 'accepted')
              .map((member) => member.group_id);
            const loadedGroups = await listGroupConversations(ids);
            if (active) setGroups(loadedGroups.sort((a, b) =>
              new Date(b.last_message_at || b.created_at).getTime() -
              new Date(a.last_message_at || a.created_at).getTime()
            ));
          } catch {
            // Do not prevent established one-to-one sharing if group lookup fails.
            if (active) setGroupsError('Unable to load group conversations.');
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load recipients.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [collectionId, user?.id]);

  async function shareWith(recipient: UserProfile) {
    if (sendingTo || !user?.id || !DM_NAV_ENABLED) return;
    setSendingTo(recipient.id);
    try {
      const conversationId = await shareDmCollection(recipient.id, collectionId);
      trackAnalyticsEvent('collection_shared', { source: 'direct_message' });
      router.replace({
        pathname: '/dm-conversation',
        params: { conversationId },
      });
    } catch (cause) {
      setShareError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSendingTo(null);
    }
  }

  async function shareWithGroup(group: GroupConversation) {
    if (sendingTo || !user?.id || !GROUP_DM_ENABLED) return;
    setSendingTo(`group:${group.id}`);
    try {
      const groupId = await shareGroupCollection(group.id, collectionId);
      trackAnalyticsEvent('collection_shared', { source: 'group_message' });
      router.replace({ pathname: '/dm-group-conversation', params: { groupId } });
    } catch (cause) {
      setShareError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="Send Top 3" />
      <View style={styles.intro}>
        <AppText variant="label">{title || 'Share a Top 3'}</AppText>
        <AppText variant="body" tone="secondary">
          {GROUP_DM_ENABLED ? 'Choose a mutual follower or a group conversation.' :
            'Choose someone you mutually follow.'}
        </AppText>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppText variant="body" tone="secondary" style={styles.centerText}>
            {error}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={recipients}
          keyExtractor={(recipient) => recipient.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={GROUP_DM_ENABLED ? (
            <View>
              <AppText variant="sectionTitle" style={styles.sectionHeading}>Groups</AppText>
              {groupsError ? (
                <AppText variant="body" tone="secondary" style={styles.groupError}>{groupsError}</AppText>
              ) : null}
              {!groups.length && !groupsError ? (
                <AppText variant="body" tone="secondary" style={styles.groupError}>
                  No group conversations yet.
                </AppText>
              ) : null}
              {groups.map((group) => (
                <Pressable key={group.id}
                  onPress={() => { void shareWithGroup(group); }}
                  disabled={sendingTo !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Send Top 3 to group ${group.name}`}
                  style={[styles.row, { borderBottomColor: colors.border }]}>
                  <Ionicons name="people-circle-outline" size={44} color={colors.accent} />
                  <View style={styles.recipientText}>
                    <AppText variant="label" numberOfLines={1}>{group.name}</AppText>
                    <AppText variant="body" tone="secondary">Group conversation</AppText>
                  </View>
                  {sendingTo === `group:${group.id}` ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <AppText variant="action">Send</AppText>
                  )}
                </Pressable>
              ))}
              <AppText variant="sectionTitle" style={styles.sectionHeading}>People</AppText>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { void shareWith(item); }}
              disabled={sendingTo !== null}
              accessibilityRole="button"
              accessibilityLabel={`Send Top 3 to ${item.displayName || item.username}`}
              style={[styles.row, { borderBottomColor: colors.border }]}>
              <UserAvatar
                displayName={item.displayName || item.username}
                avatarUrl={item.avatarUrl}
                size={44}
              />
              <View style={styles.recipientText}>
                <AppText variant="label">{item.displayName || item.username}</AppText>
                <AppText variant="body" tone="secondary">@{item.username}</AppText>
              </View>
              {sendingTo === item.id ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <AppText variant="action">Send</AppText>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMessage}>
              <AppText variant="body" tone="secondary" style={styles.centerText}>
                {groups.length ? 'No individual recipients available.' :
                  GROUP_DM_ENABLED ? 'No mutual followers or group conversations available yet.' :
                    'No mutual followers available to message yet.'}
              </AppText>
            </View>
          }
        />
      )}
      <ActionSheet
        visible={shareError !== null}
        title="Unable to share Top 3"
        message={shareError ?? undefined}
        actions={[{ label: 'OK', onPress: () => setShareError(null) }]}
        onClose={() => setShareError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  intro: { paddingHorizontal: 20, paddingVertical: 18, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  centerText: { textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  recipientText: { flex: 1, gap: 4 },
  sectionHeading: { marginTop: 14, marginBottom: 4 },
  groupError: { paddingVertical: 8 },
  emptyMessage: { paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
});
