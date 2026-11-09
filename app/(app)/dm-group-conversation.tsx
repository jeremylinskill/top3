import ActionSheet, { type ActionSheetAction } from '@/components/action-sheet';
import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import { useBlock } from '@/context/block-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { GROUP_DM_ENABLED } from '@/lib/dm-availability';
import {
  getGroupConversation, getGroupMembers, leaveGroup, listGroupMessages,
  markGroupRead, sendGroupMessage, type GroupMessage,
} from '@/lib/supabase/group-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import { createUserReport, type ReportReason } from '@/lib/supabase/reports';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, AppState, FlatList, KeyboardAvoidingView,
  Pressable, RefreshControl, Share, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const REPORT_REASONS: { label: string; reason: ReportReason }[] = [
  { label: 'Spam', reason: 'spam' },
  { label: 'Harassment or bullying', reason: 'harassment' },
  { label: 'Hate or abusive content', reason: 'hate_or_abuse' },
  { label: 'Inappropriate content', reason: 'inappropriate_content' },
  { label: 'Other', reason: 'other' },
];

type SheetState =
  | { type: 'options' }
  | { type: 'leave' }
  | { type: 'message'; message: GroupMessage }
  | { type: 'report'; userId: string }
  | { type: 'block'; userId: string }
  | { type: 'feedback'; title: string; message: string }
  | null;

export default function GroupDmConversationScreen() {
  const colors = useAppColors();
  const { user } = useAuth();
  const { blockUser } = useBlock();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const id = GROUP_DM_ENABLED && typeof groupId === 'string' ? groupId : '';
  const userId = user?.id ?? '';
  const [name, setName] = useState('');
  const [memberSummary, setMemberSummary] = useState('');
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const generation = useRef(0);
  const listRef = useRef<FlatList<GroupMessage>>(null);

  const refresh = useCallback(async (pull = false, silent = false) => {
    const current = ++generation.current;
    if (!id || !userId) {
      setAvailable(false); setLoading(false); setError('Group unavailable.');
      return;
    }
    if (pull) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const [group, members] = await Promise.all([
        getGroupConversation(id), getGroupMembers(id),
      ]);
      if (!group || !members.some((m) => m.user_id === userId && m.status === 'accepted')) {
        throw new Error('Group unavailable.');
      }
      const page = await listGroupMessages(id, 50);
      const profileIds = Array.from(new Set([
        ...members.map((member) => member.user_id), ...page.map((message) => message.sender_id),
      ]));
      let names: Record<string, string> = {};
      try {
        const profiles = profileIds.length ? await getProfilesByIds(profileIds) : [];
        names = Object.fromEntries(profiles.map((profile) => [
          profile.id, profile.displayName || profile.username,
        ]));
      } catch {
        // Messages are still readable even if a profile lookup fails.
      }
      if (current !== generation.current) return;
      setName(group.name);
      setMessages(page);
      setSenderNames(names);
      setMemberSummary(`${members.filter((m) => m.status === 'accepted').length} joined · ${
        members.filter((m) => m.status === 'invited').length
      } invited`);
      setAvailable(true);
      setError(null);
    } catch (cause) {
      if (current !== generation.current) return;
      if (!silent) {
        setAvailable(false);
        setError(cause instanceof Error ? cause.message : 'Unable to open group.');
      }
    } finally {
      if (current === generation.current) {
        setLoading(false); setRefreshing(false);
      }
    }
  }, [id, userId]);

  useFocusEffect(useCallback(() => {
    setViewing(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      setViewing(state === 'active');
      if (state === 'active') void refresh(false, true);
    });
    void refresh();
    return () => {
      generation.current += 1;
      setViewing(false);
      subscription.remove();
    };
  }, [refresh]));

  // Message IDs are validated by the server before advancing a read position.
  useEffect(() => {
    if (!viewing || loading || !available || !messages.length) return;
    const latest = messages[messages.length - 1];
    void markGroupRead(id, latest.id).catch(() => {
      // Keep unread state on error; next focus retries.
    });
  }, [viewing, loading, available, messages, id]);

  async function send() {
    const body = draft.trim();
    if (!available || sending || !body || body.length > 2000) return;
    setSending(true);
    try {
      await sendGroupMessage(id, body);
      setDraft('');
      await refresh(false, true);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (cause) {
      setSheet({ type: 'feedback', title: 'Unable to send message',
        message: cause instanceof Error ? cause.message : 'Please try again.' });
    } finally {
      setSending(false);
    }
  }

  async function confirmLeave() {
    if (sheetBusy) return;
    setSheetBusy(true);
    try {
      await leaveGroup(id);
      setSheet(null);
      router.replace('/messages');
    } catch (cause) {
      setSheet({ type: 'feedback', title: 'Unable to leave group',
        message: cause instanceof Error ? cause.message : 'Please try again.' });
    } finally {
      setSheetBusy(false);
    }
  }

  async function reportSender(reportedUserId: string, reason: ReportReason) {
    if (sheetBusy || !userId || reportedUserId === userId) return;
    setSheetBusy(true);
    try {
      await createUserReport({ reporterId: userId, reportedUserId, reason });
      setSheet({ type: 'feedback', title: 'Report submitted',
        message: 'Thank you. Your report has been sent for review.' });
    } catch {
      setSheet({ type: 'feedback', title: 'Unable to report user', message: 'Please try again.' });
    } finally {
      setSheetBusy(false);
    }
  }

  async function confirmBlock(blockedUserId: string) {
    if (sheetBusy || !userId || blockedUserId === userId) return;
    setSheetBusy(true);
    try {
      await blockUser(blockedUserId);
      setSheet(null);
      router.replace('/messages');
    } catch {
      setSheet({ type: 'feedback', title: 'Unable to block user', message: 'Please try again.' });
    } finally {
      setSheetBusy(false);
    }
  }

  const closeSheet = () => setSheet(null);
  const cancel: ActionSheetAction = { label: 'Cancel', variant: 'cancel', onPress: closeSheet };
  let sheetTitle: string | undefined;
  let sheetMessage: string | undefined;
  let sheetActions: ActionSheetAction[] = [];
  switch (sheet?.type) {
    case 'options':
      sheetTitle = 'Group options';
      sheetActions = [
        { label: 'Leave Group', variant: 'destructive', onPress: () => setSheet({ type: 'leave' }) },
        cancel,
      ];
      break;
    case 'leave':
      sheetTitle = 'Leave this group?';
      sheetMessage = 'You will lose access to this conversation and its messages.';
      sheetActions = [
        { label: 'Leave Group', variant: 'destructive', onPress: () => { void confirmLeave(); } },
        cancel,
      ];
      break;
    case 'message': {
      const selectedMessage = sheet.message;
      sheetTitle = 'Message options';
      sheetActions = [
        { label: 'Copy or Share', onPress: () => {
          const content = selectedMessage.body;
          setSheet(null);
          // Match the existing DM sheet: allow it to dismiss on iOS before
          // presenting the native share sheet.
          setTimeout(() => {
            void Share.share({ message: content }).catch(() => {
              setSheet({ type: 'feedback', title: 'Unable to share', message: 'Please try again.' });
            });
          }, 350);
        } },
        ...(selectedMessage.sender_id !== userId ? [
          { label: 'Report Sender', onPress: () => setSheet({ type: 'report', userId: selectedMessage.sender_id }) } satisfies ActionSheetAction,
          { label: 'Block Sender', variant: 'destructive', onPress: () => setSheet({ type: 'block', userId: selectedMessage.sender_id }) } satisfies ActionSheetAction,
        ] : []),
        cancel,
      ];
      break;
    }
    case 'report': {
      const reportedUserId = sheet.userId;
      sheetTitle = 'Report user';
      sheetMessage = 'Why are you reporting this member?';
      sheetActions = [
        ...REPORT_REASONS.map(({ label, reason }): ActionSheetAction => ({
          label, onPress: () => { void reportSender(reportedUserId, reason); },
        })),
        cancel,
      ];
      break;
    }
    case 'block': {
      const blockedUserId = sheet.userId;
      sheetTitle = 'Block this member?';
      sheetMessage = 'You will no longer be able to exchange group messages while this block exists.';
      sheetActions = [
        { label: 'Block User', variant: 'destructive', onPress: () => { void confirmBlock(blockedUserId); } },
        cancel,
      ];
      break;
    }
    case 'feedback':
      sheetTitle = sheet.title;
      sheetMessage = sheet.message;
      sheetActions = [{ label: 'OK', onPress: closeSheet }];
      break;
  }

  const canSend = available && !sending && !!draft.trim() && draft.trim().length <= 2000;
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="Group Chat"
        rightIconName={available ? 'ellipsis-horizontal' : undefined}
        onRightPress={() => setSheet({ type: 'options' })}
        rightAccessibilityLabel="Group options" />
      <KeyboardAvoidingView style={styles.content} behavior="padding">
        {loading && !refreshing ? (
          <View style={styles.state}><ActivityIndicator color={colors.tertiaryText} /></View>
        ) : error ? (
          <View style={styles.state}>
            <AppText variant="body" style={styles.centerText}>{error}</AppText>
            <Pressable accessibilityRole="button" onPress={() => void refresh()}>
              <AppText variant="action">Try again</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <AppText variant="selectionTitle" numberOfLines={2}>{name}</AppText>
              <AppText variant="caption" tone="secondary">{memberSummary}</AppText>
            </View>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)}
                  tintColor={colors.tertiaryText} />
              }
              renderItem={({ item }) => {
                const own = item.sender_id === userId;
                return (
                  <View style={[styles.messageRow, own && styles.ownMessageRow]}>
                    <Pressable accessibilityRole="button"
                      accessibilityLabel={`${senderNames[item.sender_id] || 'Member'} message options`}
                      accessibilityHint="Tap or long press for copy, report, or block options"
                      onPress={() => setSheet({ type: 'message', message: item })}
                      onLongPress={() => setSheet({ type: 'message', message: item })}
                      style={[styles.bubble, {
                        backgroundColor: own ? colors.accent : colors.surface,
                      }]}>
                      {!own ? (
                        <AppText variant="caption" tone="secondary" style={styles.senderName}>
                          {senderNames[item.sender_id] || 'Group member'}
                        </AppText>
                      ) : null}
                      <AppText variant="body" tone={own ? 'onPrimary' : 'primary'}>{item.body}</AppText>
                    </Pressable>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <AppText variant="body" tone="secondary" style={styles.centerText}>
                    No messages yet. Say hello!
                  </AppText>
                </View>
              }
            />
            <View style={[styles.composer, { borderTopColor: colors.border }]}>
              <TextInput value={draft} onChangeText={setDraft} multiline maxLength={2000}
                editable={!sending} placeholder="Message" placeholderTextColor={colors.tertiaryText}
                accessibilityLabel="Group message text"
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]} />
              <Pressable accessibilityRole="button" accessibilityLabel="Send group message"
                disabled={!canSend} onPress={() => { void send(); }} style={styles.sendButton}>
                {sending ? <ActivityIndicator size="small" color={colors.accent} /> : (
                  <Ionicons name="send" size={22} color={canSend ? colors.accent : colors.tertiaryText} />
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
      <ActionSheet visible={sheet !== null} title={sheetTitle} message={sheetMessage}
        actions={sheetActions} onClose={closeSheet} dismissDisabled={sheetBusy} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  centerText: { textAlign: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingVertical: 20, flexGrow: 1, gap: 12 },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  ownMessageRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '83%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, gap: 5 },
  senderName: { fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  composer: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 15, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, fontSize: 16 },
  sendButton: { minHeight: 42, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
});
