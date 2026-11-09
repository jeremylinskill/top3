import AppText from '@/components/app-text';
import { useAppColors } from '@/hooks/use-app-colors';
import { GROUP_DM_ENABLED } from '@/lib/dm-availability';
import {
  getMyGroupReadStates, hasUnreadGroupMessages, listGroupConversations,
  listMyGroupMemberships, respondToGroupInvitation,
  type GroupConversation, type GroupMember,
} from '@/lib/supabase/group-messages';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, View } from 'react-native';

type GroupInboxRow = { group: GroupConversation; member: GroupMember; unread: boolean };
type Props = { userId: string; searchQuery: string; refreshing: boolean };

export default function GroupDmInboxSection({ userId, searchQuery, refreshing }: Props) {
  const colors = useAppColors();
  const [rows, setRows] = useState<GroupInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<GroupInboxRow[]> => {
    const memberships = await listMyGroupMemberships(userId);
    const ids = memberships.map((member) => member.group_id);
    if (!ids.length) return [];
    const [groups, reads] = await Promise.all([
      listGroupConversations(ids), getMyGroupReadStates(userId, ids),
    ]);
    const byGroupId = new Map(memberships.map((member) => [member.group_id, member]));
    const readByGroupId = new Map(reads.map((read) => [read.group_id, read.last_read_at]));
    const result: GroupInboxRow[] = [];
    // Keep queries bounded; invitations must never try to read group messages.
    for (let offset = 0; offset < groups.length; offset += 4) {
      const batch = groups.slice(offset, offset + 4);
      const flags = await Promise.all(batch.map((group) => {
        const member = byGroupId.get(group.id);
        return member?.status === 'accepted' && group.last_message_at
          ? hasUnreadGroupMessages(group.id, userId, readByGroupId.get(group.id) ?? null)
          : Promise.resolve(false);
      }));
      batch.forEach((group, index) => {
        const member = byGroupId.get(group.id);
        if (member) result.push({ group, member, unread: flags[index] });
      });
    }
    return result.sort((a, b) =>
      new Date(b.group.last_message_at || b.group.created_at).getTime() -
      new Date(a.group.last_message_at || a.group.created_at).getTime()
    );
  }, [userId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!GROUP_DM_ENABLED || !userId) {
      setRows([]);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    void load().then((next) => {
      if (active) setRows(next);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load groups.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void load().then((next) => { if (active) setRows(next); })
          .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load groups.'); });
      }
    });
    return () => { active = false; appState.remove(); };
  }, [load, userId]));

  // Share the parent inbox's pull-to-refresh gesture without modifying its
  // existing one-to-one DM refresh behaviour.
  useEffect(() => {
    if (!refreshing || !GROUP_DM_ENABLED || !userId) return;
    let active = true;
    void load().then((next) => { if (active) setRows(next); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load groups.'); });
    return () => { active = false; };
  }, [refreshing, load, userId]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLocaleLowerCase();
    return term ? rows.filter((row) => row.group.name.toLocaleLowerCase().includes(term)) : rows;
  }, [rows, searchQuery]);
  const invitations = filtered.filter((row) => row.member.status === 'invited');
  const groups = filtered.filter((row) => row.member.status === 'accepted');

  async function respond(groupId: string, accept: boolean) {
    if (!GROUP_DM_ENABLED || busyGroupId || !userId) return;
    setBusyGroupId(groupId);
    setError(null);
    try {
      await respondToGroupInvitation(groupId, accept);
      if (accept) {
        router.push({ pathname: '/dm-group-conversation', params: { groupId } });
      } else {
        setRows((current) => current.filter((row) => row.group.id !== groupId));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to respond to invitation.');
    } finally {
      setBusyGroupId(null);
    }
  }

  if (!GROUP_DM_ENABLED || (!loading && !error && !rows.length)) return null;
  if (!loading && !error && !filtered.length) return null;

  return (
    <View style={styles.section}>
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.tertiaryText} /></View> : null}
      {error ? (
        <View style={styles.error}>
          <AppText variant="body" tone="secondary">{error}</AppText>
          <Pressable accessibilityRole="button" onPress={() => {
            setError(null); setLoading(true);
            void load().then(setRows).catch((cause) => {
              setError(cause instanceof Error ? cause.message : 'Unable to load groups.');
            }).finally(() => setLoading(false));
          }}>
            <AppText variant="action">Try again</AppText>
          </Pressable>
        </View>
      ) : null}
      {invitations.length ? (
        <View style={styles.subsection}>
          <AppText variant="sectionTitle" style={styles.heading}>Group invitations</AppText>
          {invitations.map(({ group }) => (
            <View key={group.id} style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.identity}>
                <Ionicons name="people-circle-outline" size={38} color={colors.accent} />
                <View style={styles.titleBlock}>
                  <AppText variant="selectionTitle" numberOfLines={2}>{group.name}</AppText>
                  <AppText variant="caption" tone="secondary">You're invited to join</AppText>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Decline invitation to ${group.name}`}
                  disabled={busyGroupId !== null} onPress={() => { void respond(group.id, false); }}
                  style={[styles.action, { borderColor: colors.border, borderWidth: 1 }]}>
                  <AppText variant="label">Decline</AppText>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Accept invitation to ${group.name}`}
                  disabled={busyGroupId !== null} onPress={() => { void respond(group.id, true); }}
                  style={[styles.action, { backgroundColor: colors.accent }]}>
                  {busyGroupId === group.id ? <ActivityIndicator color="#151515" size="small" /> : (
                    <AppText variant="label" tone="onPrimary">Accept</AppText>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {groups.length ? (
        <View style={styles.subsection}>
          <AppText variant="sectionTitle" style={styles.heading}>Group conversations</AppText>
          {groups.map(({ group, unread }) => (
            <Pressable key={group.id} accessibilityRole="button"
              accessibilityLabel={`Open group conversation ${group.name}`}
              onPress={() => router.push({ pathname: '/dm-group-conversation', params: { groupId: group.id } })}
              style={[styles.card, styles.groupRow, { backgroundColor: colors.surface }]}>
              <Ionicons name="people-circle-outline" size={44} color={colors.accent} />
              <View style={styles.titleBlock}>
                <AppText variant="selectionTitle" numberOfLines={1}>{group.name}</AppText>
                <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                  {group.last_message_at ? 'Group conversation' : 'No messages yet'}
                </AppText>
              </View>
              {unread ? <View accessibilityLabel="Unread group message"
                style={[styles.unreadDot, { backgroundColor: colors.accent }]} /> : (
                <Ionicons name="chevron-forward" size={20} color={colors.tertiaryText} />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 12 },
  subsection: { marginTop: 16, gap: 10 },
  heading: { marginHorizontal: 20, marginBottom: 2 },
  loading: { padding: 12 },
  error: { marginHorizontal: 20, paddingVertical: 10, gap: 6 },
  card: { borderRadius: 14, marginHorizontal: 20, padding: 14, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderRadius: 10, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
});
