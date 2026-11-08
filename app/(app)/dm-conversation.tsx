import ActionSheet, { type ActionSheetAction } from '@/components/action-sheet';
import AppText from '@/components/app-text';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import { useBlock } from '@/context/block-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import {
  getDmConversation,
  getDmSharedCollectionPreviews,
  type DmSharedCollectionPreview,
  getOtherDmParticipant,
  listDmMessages,
  listDmMessagesFrom,
  markDmRead,
  sendDmMessage,
  type DmMessage,
} from '@/lib/supabase/direct-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { createMessageReport, createUserReport, type ReportReason } from '@/lib/supabase/reports';
import type { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ConversationSafetySheet =
  | { type: 'actions' }
  | { type: 'message-actions'; message: DmMessage }
  | { type: 'report-reasons'; message?: DmMessage }
  | { type: 'confirm-report'; reason: ReportReason; label: string; message?: DmMessage }
  | { type: 'confirm-block' }
  | { type: 'report-success' }
  | { type: 'report-error' }
  | { type: 'block-error' }
  | { type: 'feedback'; title: string; message: string }
  | null;

function getSharedTop3Intro(
  message: DmMessage,
  preview: DmSharedCollectionPreview | undefined,
  creatorNames: Record<string, string>
): string {
  if (!preview) return 'This Top 3 is unavailable';
  // “My” refers to the person who actually sent this message, even when
  // the recipient is viewing it. For forwarded lists, credit the creator.
  if (preview.user_id === message.sender_id) return `Here's my ${preview.title}`;
  const creatorName = creatorNames[preview.user_id];
  return creatorName
    ? `Here's ${creatorName}'s ${preview.title}`
    : `Check out this ${preview.title}`;
}

const USER_REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'spam', label: 'Spam' },
  { reason: 'harassment', label: 'Harassment or bullying' },
  { reason: 'hate_or_abuse', label: 'Hate or abusive content' },
  { reason: 'inappropriate_content', label: 'Inappropriate content' },
  { reason: 'impersonation', label: 'Impersonation' },
  { reason: 'other', label: 'Other' },
];

export default function DmConversationScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const ignoreScroll = useCallback((_y: number) => {}, []);
  const ignoreScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler: onHeaderScroll, headerStyle } =
    useHomeStickyHeader(ignoreScroll, ignoreScrolled);
  const { user } = useAuth();
  const { blockUser } = useBlock();
  const { conversationId, focusMessageId } = useLocalSearchParams<{
    conversationId?: string | string[];
    focusMessageId?: string | string[];
  }>();
  // Fail closed on direct/deep-linked routes when DM is not enabled.
  const id = DM_NAV_ENABLED && typeof conversationId === 'string'
    ? conversationId
    : '';
  const focusedId = typeof focusMessageId === 'string' ? focusMessageId : '';
  const userId = user?.id ?? '';
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [sharedPreviews, setSharedPreviews] = useState<Record<string, DmSharedCollectionPreview>>({});
  const [sharedCreatorNames, setSharedCreatorNames] = useState<Record<string, string>>({});
  const [other, setOther] = useState<UserProfile | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [safetySheet, setSafetySheet] = useState<ConversationSafetySheet>(null);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const generation = useRef(0);
  const listRef = useRef<FlatList<DmMessage>>(null);

  const refresh = useCallback(async (pull = false, silent = false) => {
    const current = ++generation.current;
    if (!id || !userId) {
      setAvailable(false);
      setError('Conversation unavailable.');
      setLoading(false);
      return;
    }
    if (pull) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const conversation = await getDmConversation(id);
      const otherId = conversation && getOtherDmParticipant(conversation, userId);
      if (!otherId) throw new Error('Conversation unavailable.');
      const [profiles, page] = await Promise.all([
        getProfilesByIds([otherId]),
        focusedId ? listDmMessagesFrom(id, focusedId, 50) : listDmMessages(id, 50),
      ]);
      // The published collection query applies the reader's existing RLS
      // rules. Missing or newly private lists never disclose their titles.
      const previews = await getDmSharedCollectionPreviews(
        page.map((message) => message.shared_collection_id ?? '').filter(Boolean)
      );
      // Only look up creators of forwarded lists. The shared preview lookup
      // already enforces published-list visibility through collection RLS.
      const forwardedCreatorIds = Array.from(new Set(page.flatMap((message) => {
        const preview = message.shared_collection_id
          ? previews[message.shared_collection_id]
          : undefined;
        return preview && preview.user_id !== message.sender_id ? [preview.user_id] : [];
      })));
      let creatorNames: Record<string, string> = {};
      if (forwardedCreatorIds.length) {
        try {
          const creators = await getProfilesByIds(forwardedCreatorIds);
          creatorNames = Object.fromEntries(creators.map((profile) => [
            profile.id, (profile.displayName || profile.username || '').trim(),
          ]));
        } catch {
          // A profile lookup failure must not prevent messages from loading.
          // The shared message falls back to neutral wording.
        }
      }
      if (current !== generation.current) return;
      setOther(profiles[0] ?? null);
      setMessages(page);
      setSharedPreviews(previews);
      setSharedCreatorNames(creatorNames);
      setAvailable(true);
      setError(null);
    } catch (cause) {
      if (current !== generation.current) return;
      if (!silent) {
        setAvailable(false);
        setError(cause instanceof Error ? cause.message : 'Unable to load conversation.');
      }
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, userId, focusedId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setIsViewing(AppState.currentState === 'active');
    let pending: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (!active || AppState.currentState !== 'active') return;
      if (pending !== null) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        if (active) void refresh(false, true);
      }, 150);
    };

    // Only the participant-visible conversation metadata is streamed. Actual
    // message bodies are fetched through the existing dm_messages RLS policy.
    const unsubscribe = id && userId ? subscribeToTableChanges({
      channelName: `dm-conversation-${id}`,
      table: 'dm_conversations',
      filter: `id=eq.${id}`,
      events: ['UPDATE'],
      onChange: scheduleRefresh,
      onSubscribed: scheduleRefresh,
    }) : () => {};

    const appState = AppState.addEventListener('change', (state) => {
      setIsViewing(active && state === 'active');
      if (state === 'active') scheduleRefresh();
    });
    void refresh();
    return () => {
      active = false;
      setIsViewing(false);
      if (pending !== null) clearTimeout(pending);
      generation.current += 1;
      unsubscribe();
      appState.remove();
    };
  }, [id, userId, refresh]));

  // Mark only the most recent message in the loaded page as read.
  // The server requires a real message ID and enforces participant access.
  useEffect(() => {
    if (!isViewing || !available || loading || !id || !messages.length || focusedId) return;
    const latest = messages[messages.length - 1];
    void markDmRead(id, latest.id).catch(() => {
      // Retain unread state if marking read fails; retry on next focus.
    });
  }, [isViewing, available, loading, id, messages, userId, focusedId]);

  async function send() {
    const body = draft.trim();
    if (!available || sending || !body || body.length > 2000) return;
    setSending(true);
    try {
      await sendDmMessage(id, body);
      setDraft('');
      if (focusedId) {
        router.setParams({ focusMessageId: '' });
      } else {
        await refresh(true);
        listRef.current?.scrollToEnd({ animated: true });
      }
    } catch (cause) {
      setSafetySheet({
        type: 'feedback',
        title: 'Unable to send message',
        message: cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setSending(false);
    }
  }

  async function reportConversationUser(reason: ReportReason) {
    if (!other?.id || !userId || other.id === userId || safetyBusy) return;
    setSafetyBusy(true);
    try {
      await createUserReport({
        reporterId: userId,
        reportedUserId: other.id,
        reason,
      });
      setSafetySheet({ type: 'report-success' });
    } catch {
      setSafetySheet({ type: 'report-error' });
    } finally {
      setSafetyBusy(false);
    }
  }

  async function reportReceivedMessage(message: DmMessage, reason: ReportReason) {
    if (!userId || !other?.id || safetyBusy || message.sender_id !== other.id ||
        message.conversation_id !== id) return;
    setSafetyBusy(true);
    try {
      await createMessageReport({
        reporterId: userId,
        reportedUserId: other.id,
        reportedMessageId: message.id,
        reason,
      });
      setSafetySheet({ type: 'report-success' });
    } catch {
      setSafetySheet({ type: 'report-error' });
    } finally {
      setSafetyBusy(false);
    }
  }

  function openCopyOrShare(message: DmMessage) {
    // Close the custom sheet before opening the native share sheet on iOS.
    // Sharing text provides the system Copy action without a new native dependency.
    setSafetySheet(null);
    setTimeout(() => {
      void Share.share({ message: message.body }).catch(() => {
        setSafetySheet({
          type: 'feedback',
          title: 'Unable to share message',
          message: 'Please try again.',
        });
      });
    }, 350);
  }

  async function blockConversationUser() {
    if (!other?.id || !userId || other.id === userId || safetyBusy) return;
    setSafetyBusy(true);
    try {
      await blockUser(other.id);
      setSafetySheet(null);
      router.back();
    } catch {
      setSafetySheet({ type: 'block-error' });
    } finally {
      setSafetyBusy(false);
    }
  }

  let safetyTitle: string | undefined;
  let safetyMessage: string | undefined;
  let safetyActions: ActionSheetAction[] = [];
  const closeSafetySheet = () => setSafetySheet(null);
  const cancelAction: ActionSheetAction = {
    label: 'Cancel', variant: 'cancel', onPress: closeSafetySheet,
  };

  switch (safetySheet?.type) {
    case 'actions':
      safetyTitle = 'Conversation options';
      safetyActions = [
        { label: 'Report User', onPress: () => setSafetySheet({ type: 'report-reasons' }) },
        { label: 'Block User', variant: 'destructive', onPress: () => setSafetySheet({ type: 'confirm-block' }) },
        cancelAction,
      ];
      break;
    case 'message-actions':
      safetyTitle = 'Message options';
      safetyActions = [
        { label: 'Copy or Share', onPress: () => openCopyOrShare(safetySheet.message) },
        ...(safetySheet.message.sender_id !== userId ? [{
          label: 'Report Message',
          onPress: () => setSafetySheet({ type: 'report-reasons', message: safetySheet.message }),
        } satisfies ActionSheetAction] : []),
        cancelAction,
      ];
      break;
    case 'report-reasons':
      safetyTitle = safetySheet.message ? 'Report Message' : 'Report User';
      safetyMessage = safetySheet.message
        ? 'Why are you reporting this message?'
        : 'Why are you reporting this person?';
      safetyActions = [
        ...USER_REPORT_REASONS
          .filter(({ reason }) => !safetySheet.message || reason !== 'impersonation')
          .map(({ reason, label }): ActionSheetAction => ({
            label, onPress: () => setSafetySheet({ type: 'confirm-report', reason, label, message: safetySheet.message }),
          })),
        cancelAction,
      ];
      break;
    case 'confirm-report':
      safetyTitle = safetySheet.message ? 'Report this message?' : 'Submit report?';
      safetyMessage = `Reason: ${safetySheet.label}`;
      safetyActions = [
        { label: 'Submit Report', onPress: () => {
          if (safetySheet.message) {
            void reportReceivedMessage(safetySheet.message, safetySheet.reason);
          } else {
            void reportConversationUser(safetySheet.reason);
          }
        } },
        cancelAction,
      ];
      break;
    case 'confirm-block':
      safetyTitle = 'Block this user?';
      safetyMessage = 'Blocking prevents future messages between you. You can unblock this account later in Settings.';
      safetyActions = [
        { label: 'Block User', variant: 'destructive', onPress: () => { void blockConversationUser(); } },
        cancelAction,
      ];
      break;
    case 'report-success':
      safetyTitle = 'Report submitted';
      safetyMessage = 'Thank you. Your report has been sent for review.';
      safetyActions = [{ label: 'Done', onPress: closeSafetySheet }];
      break;
    case 'report-error':
      safetyTitle = 'Unable to submit report';
      safetyMessage = 'Please try again.';
      safetyActions = [{ label: 'OK', onPress: closeSafetySheet }];
      break;
    case 'block-error':
      safetyTitle = 'Unable to block user';
      safetyMessage = 'Please try again.';
      safetyActions = [{ label: 'OK', onPress: closeSafetySheet }];
      break;
    case 'feedback':
      safetyTitle = safetySheet.title;
      safetyMessage = safetySheet.message;
      safetyActions = [{ label: 'OK', onPress: closeSafetySheet }];
      break;
  }

  const otherName = other?.displayName || other?.username || 'Conversation';
  const canSend = available && !sending && Boolean(draft.trim()) && draft.trim().length <= 2000;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          styles.stickyHeader,
          { height: insets.top + SCREEN_HEADER_HEIGHT + 16 },
          headerStyle,
        ]}>
        <ScreenHeader
          showBackButton
          rightIconName={other ? 'ellipsis-horizontal' : undefined}
          onRightPress={() => setSafetySheet({ type: 'actions' })}
          rightAccessibilityLabel="Conversation options, report or block user"
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>
      <KeyboardAvoidingView
        style={styles.content}
        behavior="padding">
        {loading && !refreshing ? (
          <View style={styles.state}><ActivityIndicator color={colors.tertiaryText} /></View>
        ) : error ? (
          <View style={styles.state}>
            <AppText variant="body" style={styles.centerText}>{error}</AppText>
            <Pressable onPress={() => void refresh()} accessibilityRole="button">
              <AppText variant="action">Try again</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <Reanimated.FlatList
              onScroll={onHeaderScroll}
              scrollEventThrottle={16}
              ListHeaderComponent={
                <>
                  {other ? (
                    <View style={[styles.contact, { borderBottomColor: colors.surface }]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${otherName}'s profile`}
                        onPress={() => router.push({
                          pathname: '/public-profile',
                          params: { userId: other.id },
                        })}
                        style={styles.contactProfileLink}>
                        <UserAvatar displayName={otherName} avatarUrl={other.avatarUrl} size={40} />
                        <View style={styles.contactIdentity}>
                          <AppText variant="selectionTitle" numberOfLines={1}>
                            {otherName}
                          </AppText>
                          <AppText variant="body" tone="secondary" numberOfLines={1}>
                            @{other.username}
                          </AppText>
                        </View>
                      </Pressable>
                    </View>
                  ) : null}
                  {focusedId ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Jump to latest messages"
                      onPress={() => router.setParams({ focusMessageId: '' })}
                      style={[styles.latestButton, { borderBottomColor: colors.border }]}>
                      <Ionicons name="arrow-down" size={16} color={colors.accent} />
                      <AppText variant="action">Jump to latest</AppText>
                    </Pressable>
                  ) : null}
                </>
              }
              ref={listRef}
              style={styles.messages}
              contentContainerStyle={[
                styles.messagesContent,
                { paddingTop: insets.top + SCREEN_HEADER_HEIGHT },
              ]}
              data={messages}
              keyExtractor={(item) => item.id}
              onContentSizeChange={() => {
                if (!focusedId) listRef.current?.scrollToEnd({ animated: false });
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} tintColor={colors.tertiaryText} />
              }
              renderItem={({ item }) => {
                const own = item.sender_id === userId;
                return (
                  <View style={[styles.bubbleRow, own && styles.ownBubbleRow]}>
                    <Pressable
                      onPress={() => {
                        if (item.shared_collection_id && sharedPreviews[item.shared_collection_id]) {
                          router.push({
                            pathname: '/published-top3',
                            params: { postId: `post-${item.shared_collection_id}` },
                          });
                        }
                      }}
                      onLongPress={() => setSafetySheet({ type: 'message-actions', message: item })}
                      accessibilityRole="button"
                      accessibilityLabel={item.shared_collection_id && sharedPreviews[item.shared_collection_id]
                        ? `Open shared Top 3: ${sharedPreviews[item.shared_collection_id].title}`
                        : 'Message options'}
                      accessibilityHint={item.shared_collection_id && sharedPreviews[item.shared_collection_id]
                        ? 'Tap to open the shared list, or long press for message options'
                        : 'Long press for options to copy, share, or report this message'}
                      accessibilityActions={[{ name: 'activate', label: 'Message options' }]}
                      onAccessibilityAction={(event) => {
                        if (event.nativeEvent.actionName === 'activate') {
                          setSafetySheet({ type: 'message-actions', message: item });
                        }
                      }}
                      style={[
                        styles.bubble,
                        own ? styles.ownBubble : styles.incomingBubble,
                        { backgroundColor: own ? colors.accent : colors.surface },
                        item.id === focusedId ? { borderWidth: 2, borderColor: colors.text } : null,
                      ]}>
                      <Image

                        source={require('../../assets/dm-bubble-tail.png')}
                        resizeMode="stretch"
                        style={[
                          styles.bubbleTail,
                          own ? styles.ownBubbleTail : styles.incomingBubbleTail,
                          { tintColor: own ? colors.accent : colors.surface },
                        ]}
                      />
                      {item.shared_collection_id ? (
                        <View style={styles.sharedCollection}>
                          <AppText variant="body" tone={own ? 'onPrimary' : 'primary'}>
                            {getSharedTop3Intro(
                              item,
                              sharedPreviews[item.shared_collection_id],
                              sharedCreatorNames
                            )}
                          </AppText>
                          {sharedPreviews[item.shared_collection_id] ? (
                            <AppText variant="label" tone={own ? 'onPrimary' : 'primary'}>
                              Tap to view  →
                            </AppText>
                          ) : null}
                        </View>
                      ) : (
                        <AppText variant="body" tone={own ? 'onPrimary' : 'primary'}>
                          {item.body}
                        </AppText>
                      )}
                    </Pressable>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyMessages}>
                  <AppText variant="body" tone="tertiary" style={styles.centerText}>
                    No messages yet. Say hello!
                  </AppText>
                </View>
              }
            />
            <View style={[styles.composer, { borderTopColor: colors.surface }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor={colors.tertiaryText}
                multiline
                maxLength={2000}
                editable={!sending}
                accessibilityLabel="Message text"
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
              />
              <Pressable
                onPress={() => void send()}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={styles.sendButton}>
                {sending ? (
                  <ActivityIndicator color="#151515" size="small" />
                ) : (
                  <Ionicons
                    name="send"
                    size={22}
                    color={canSend ? '#151515' : '#858585'}
                    style={styles.sendIcon}
                  />
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
      <ActionSheet
        visible={safetySheet !== null}
        title={safetyTitle}
        message={safetyMessage}
        actions={safetyActions}
        onClose={closeSafetySheet}
        dismissDisabled={safetyBusy}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  content: { flex: 1 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  centerText: { textAlign: 'center' },
  contact: { marginHorizontal: -16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', flexDirection: 'row', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  contactProfileLink: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIdentity: { flex: 1, gap: 2 },
  messages: { flex: 1 },
  latestButton: { paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  messagesContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexGrow: 1 },
  bubbleRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 10 },
  ownBubbleRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18, overflow: 'visible' },
  // The tail joins the lower edge instead of protruding from the side.
  // Keep that corner square under the tail so both shapes meet seamlessly.
  incomingBubble: { borderBottomLeftRadius: 0 },
  ownBubble: { borderBottomRightRadius: 0 },
  // A small anti-aliased transparent curve; tintColor follows the bubble theme.
  // This is narrower than the previous quarter-round shape and has no flat foot.
  bubbleTail: { position: 'absolute', bottom: 0, width: 18, height: 28 },
  incomingBubbleTail: { left: -14 },
  ownBubbleTail: { right: -14, transform: [{ scaleX: -1 }] },
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sharedCollection: { gap: 7, minWidth: 150 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 9, paddingBottom: 8, gap: 10 },
  input: { flex: 1, minHeight: 42, maxHeight: 112, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, lineHeight: 22, textAlignVertical: 'center' },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  // The Ionicons paper-plane glyph is visually weighted to the upper-left.
  // A 1pt nudge centres it optically without changing the hit target.
  sendIcon: { transform: [{ translateX: 1 }, { translateY: 1 }] },
});
