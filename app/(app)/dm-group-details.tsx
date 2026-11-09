import ActionSheet, { type ActionSheetAction } from '@/components/action-sheet';
import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { GROUP_DM_ENABLED } from '@/lib/dm-availability';
import { listDmShareRecipientIds } from '@/lib/supabase/direct-messages';
import {
  getGroupConversation, getGroupMembers, inviteToGroup,
  type GroupConversation, type GroupMember,
} from '@/lib/supabase/group-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import type { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SheetState =
  | { type: 'invite'; person: UserProfile }
  | { type: 'feedback'; title: string; message: string }
  | null;

export default function GroupDmDetailsScreen() {
  const colors = useAppColors();
  const { user } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const id = GROUP_DM_ENABLED && typeof groupId === 'string' ? groupId : '';
  const userId = user?.id ?? '';
  const [group, setGroup] = useState<GroupConversation | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const generation = useRef(0);

  const refresh = useCallback(async (pull = false) => {
    const current = ++generation.current;
    if (!id || !userId) {
      setGroup(null);
      setError('Group unavailable.');
      setLoading(false);
      return;
    }
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [conversation, roster] = await Promise.all([
        getGroupConversation(id), getGroupMembers(id),
      ]);
      if (!conversation || !roster.some((member) =>
        member.user_id === userId && member.status === 'accepted')) {
        throw new Error('Group unavailable.');
      }

      // A failed profile lookup should not hide an otherwise accessible group.
      let byId: Record<string, UserProfile> = {};
      try {
        const memberProfiles = await getProfilesByIds(roster.map((member) => member.user_id));
        byId = Object.fromEntries(memberProfiles.map((profile) => [profile.id, profile]));
      } catch { /* Roster names fall back to "Top 3 member". */ }

      let eligible: UserProfile[] = [];
      let inviteError: string | null = null;
      if (conversation.created_by === userId && roster.length < 10) {
        try {
          const ids = await listDmShareRecipientIds();
          const existingIds = new Set(roster.map((member) => member.user_id));
          const availableIds = ids.filter((personId) =>
            personId !== userId && !existingIds.has(personId));
          const candidates = availableIds.length ? await getProfilesByIds(availableIds) : [];
          eligible = candidates.sort((a, b) =>
            (a.displayName || a.username).localeCompare(b.displayName || b.username));
        } catch (cause) {
          inviteError = cause instanceof Error ? cause.message : 'Unable to load people.';
        }
      }
      if (current !== generation.current) return;
      setGroup(conversation);
      setMembers(roster);
      setProfiles(byId);
      setPeople(eligible);
      setPeopleError(inviteError);
    } catch (cause) {
      if (current !== generation.current) return;
      setGroup(null);
      setError(cause instanceof Error ? cause.message : 'Unable to load group details.');
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, userId]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]));

  const creator = group?.created_by === userId;
  const full = members.length >= 10;
  const accepted = members.filter((member) => member.status === 'accepted');
  const invited = members.filter((member) => member.status === 'invited');
  const filteredPeople = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return !term ? people : people.filter((person) =>
      (person.displayName || '').toLocaleLowerCase().includes(term) ||
      person.username.toLocaleLowerCase().includes(term));
  }, [people, query]);

  async function sendInvitation(person: UserProfile) {
    if (!GROUP_DM_ENABLED || !id || !creator || full || invitingId) return;
    setInvitingId(person.id);
    try {
      // RPC rechecks creator status, available slots, mutual follows, blocks,
      // previous invitations and anti-spam limits at the moment of invitation.
      await inviteToGroup(id, person.id);
      setSheet({ type: 'feedback', title: 'Invitation sent',
        message: `${person.displayName || person.username} can choose to accept or decline.` });
      await refresh(true);
    } catch (cause) {
      setSheet({ type: 'feedback', title: 'Unable to invite',
        message: cause instanceof Error ? cause.message : 'Please try again.' });
    } finally {
      setInvitingId(null);
    }
  }

  const closeSheet = () => setSheet(null);
  const invitee = sheet?.type === 'invite' ? sheet.person : null;
  const sheetActions: ActionSheetAction[] = invitee ? [
    { label: 'Send Invitation', onPress: () => { void sendInvitation(invitee); } },
    { label: 'Cancel', variant: 'cancel', onPress: closeSheet },
  ] : sheet?.type === 'feedback' ? [
    { label: 'OK', onPress: closeSheet },
  ] : [];

  const renderMember = (member: GroupMember) => {
    const profile = profiles[member.user_id];
    const name = profile?.displayName || profile?.username || 'Top 3 member';
    const isMe = member.user_id === userId;
    const isCreator = member.user_id === group?.created_by;
    return (
      <View key={member.user_id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
        <UserAvatar displayName={name} avatarUrl={profile?.avatarUrl} size={44} />
        <View style={styles.memberText}>
          <AppText variant="label" numberOfLines={1}>{name}{isMe ? ' (You)' : ''}</AppText>
          <AppText variant="caption" tone="secondary">
            {member.status === 'invited' ? 'Invitation pending' : isCreator ? 'Group creator' : 'Member'}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="Group Details" />
      {loading && !group ? (
        <View style={styles.state}><ActivityIndicator color={colors.tertiaryText} /></View>
      ) : error || !group ? (
        <View style={styles.state}>
          <AppText variant="body" tone="secondary" style={styles.centerText}>
            {error || 'Group unavailable.'}
          </AppText>
          <Pressable accessibilityRole="button" onPress={() => void refresh()}>
            <AppText variant="action">Try again</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>
          <View style={[styles.summary, { backgroundColor: colors.surface }]}>
            <Ionicons name="people-circle-outline" size={56} color={colors.accent} />
            <AppText variant="selectionTitle" style={styles.centerText}>{group.name}</AppText>
            <AppText variant="body" tone="secondary">
              {accepted.length} joined · {invited.length} invited
            </AppText>
          </View>
          <View style={styles.section}>
            <AppText variant="sectionTitle">Members</AppText>
            {accepted.map(renderMember)}
            {invited.length ? (
              <>
                <AppText variant="label" style={styles.pendingHeading}>Pending invitations</AppText>
                {invited.map(renderMember)}
              </>
            ) : null}
          </View>
          {creator ? (
            <View style={styles.section}>
              <AppText variant="sectionTitle">Invite people</AppText>
              <AppText variant="body" tone="secondary">
                {full ? 'This group has reached its 10-person limit.' :
                  'Invite mutual followers. They must accept before they can read or send messages.'}
              </AppText>
              {!full ? (
                <>
                  <SearchInput borderless value={query} onChangeText={setQuery}
                    onClear={() => setQuery('')} placeholder="Search mutual followers"
                    accessibilityLabel="Search people to invite to this group" />
                  {peopleError ? (
                    <AppText variant="body" tone="secondary">{peopleError}</AppText>
                  ) : filteredPeople.length ? filteredPeople.map((person) => {
                    const name = person.displayName || person.username;
                    return (
                      <Pressable key={person.id} accessibilityRole="button"
                        accessibilityLabel={`Invite ${name} to ${group.name}`}
                        disabled={!!invitingId}
                        onPress={() => setSheet({ type: 'invite', person })}
                        style={[styles.memberRow, { borderBottomColor: colors.border,
                          opacity: invitingId ? 0.5 : 1 }]}>
                        <UserAvatar displayName={name} avatarUrl={person.avatarUrl} size={44} />
                        <View style={styles.memberText}>
                          <AppText variant="label" numberOfLines={1}>{name}</AppText>
                          <AppText variant="caption" tone="secondary" numberOfLines={1}>
                            @{person.username}
                          </AppText>
                        </View>
                        {invitingId === person.id ? <ActivityIndicator color={colors.accent} /> :
                          <Ionicons name="person-add-outline" size={22} color={colors.accent} />}
                      </Pressable>
                    );
                  }) : (
                    <AppText variant="body" tone="secondary" style={styles.emptyText}>
                      {query.trim() ? 'No matching mutual followers.' : 'No additional mutual followers to invite.'}
                    </AppText>
                  )}
                  <AppText variant="caption" tone="secondary">
                    People who previously declined or left cannot be re-invited to this group.
                  </AppText>
                </>
              ) : null}
            </View>
          ) : (
            <AppText variant="body" tone="secondary" style={styles.info}>
              Only the group creator can invite new people.
            </AppText>
          )}
          <Pressable accessibilityRole="button" disabled={refreshing}
            onPress={() => void refresh(true)} style={styles.refreshButton}>
            {refreshing ? <ActivityIndicator color={colors.accent} /> :
              <AppText variant="action">Refresh group details</AppText>}
          </Pressable>
        </ScrollView>
      )}
      <ActionSheet visible={sheet !== null}
        title={sheet?.type === 'invite' ? 'Invite to group?' : sheet?.type === 'feedback' ? sheet.title : undefined}
        message={sheet?.type === 'invite'
          ? `Send ${sheet.person.displayName || sheet.person.username} an invitation to join ${group?.name || 'this group'}?`
          : sheet?.type === 'feedback' ? sheet.message : undefined}
        actions={sheetActions} onClose={closeSheet} dismissDisabled={invitingId !== null} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  centerText: { textAlign: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 28 },
  summary: { alignItems: 'center', borderRadius: 18, paddingVertical: 22, paddingHorizontal: 16, gap: 8 },
  section: { gap: 10 },
  memberRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  memberText: { flex: 1, minWidth: 0, gap: 2 },
  pendingHeading: { marginTop: 12 },
  info: { paddingHorizontal: 4 },
  emptyText: { paddingVertical: 10 },
  refreshButton: { alignItems: 'center', paddingVertical: 12 },
});
