import AppText from '@/components/app-text';
import GroupDmInboxSection from '@/components/group-dm-inbox-section';
import PageHeader from '@/components/page-header';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import { DM_NAV_ENABLED, GROUP_DM_ENABLED } from '@/lib/dm-availability';
import {
  getMyDmReadStates,
  getDmConversationsByIds,
  hasUnreadDmMessages,
  getOtherDmParticipant,
  listDmConversations,
  listDmShareRecipientIds,
  openDmConversation,
  listDmMessages,
  searchDmMessages,
  type DmConversation,
  type DmMessage,
} from '@/lib/supabase/direct-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import type { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchMessageItem = {
  message: DmMessage;
  otherName: string;
  otherAvatarUrl?: string | null;
};

type ConversationItem = {
  conversation: DmConversation;
  otherUserId: string;
  profile: UserProfile | null;
  latest: DmMessage | null;
  unread: boolean;
};

function relativeTime(timestamp: string | null): string {
  if (!timestamp) return '';
  const elapsed = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return '';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MessagesScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  // Match the Home, Create and Profile header's scroll-away behaviour.
  const ignoreScroll = useCallback((_y: number) => {}, []);
  const ignoreScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler: onHeaderScroll, headerStyle: headerStyle } =
    useHomeStickyHeader(ignoreScroll, ignoreScrolled);
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [query, setQuery] = useState('');
  const [matchedMessages, setMatchedMessages] = useState<SearchMessageItem[]>([]);
  const [eligiblePeople, setEligiblePeople] = useState<UserProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [openingPersonId, setOpeningPersonId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async (pull = false, silent = false) => {
    const current = ++generation.current;
    if (!userId) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (pull) setRefreshing(true);
    else if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const conversations = await listDmConversations(userId, 30);
      const ids = conversations.map((conversation) => conversation.id);
      const otherIds = conversations
        .map((conversation) => getOtherDmParticipant(conversation, userId))
        .filter((id): id is string => Boolean(id));
      const [profiles, readStates, latestPages] = await Promise.all([
        otherIds.length ? getProfilesByIds(otherIds) : Promise.resolve([]),
        getMyDmReadStates(userId, ids),
        // First inbox implementation: one latest-message request per chat.
        // Replace with a server-side paginated inbox query as usage grows.
        Promise.all(conversations.map(async (conversation) => {
          const last = await listDmMessages(conversation.id, 1);
          return last[0] ?? null;
        })),
      ]);
      if (current !== generation.current) return;
      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
      const readsById = new Map(readStates.map((read) => [read.conversation_id, read]));

      // The last message can be outgoing even when an earlier incoming message
      // is still unread. Check incoming-message existence rather than inferring
      // unread state solely from the latest preview. Limit request concurrency.
      const unreadById = new Map<string, boolean>();
      for (let offset = 0; offset < conversations.length; offset += 4) {
        const batch = conversations.slice(offset, offset + 4);
        const flags = await Promise.all(batch.map(async (conversation, index) => {
          const readAt = readsById.get(conversation.id)?.last_read_at ?? null;
          const last = latestPages[offset + index];
          if (!conversation.last_message_at ||
              (readAt && new Date(conversation.last_message_at).getTime() <= new Date(readAt).getTime())) {
            return false;
          }
          // Avoid an extra request when the newest message itself proves unread.
          if (last && last.sender_id !== userId &&
              (!readAt || new Date(last.created_at).getTime() > new Date(readAt).getTime())) {
            return true;
          }
          return hasUnreadDmMessages(conversation.id, userId, readAt);
        }));
        if (current !== generation.current) return;
        batch.forEach((conversation, index) => unreadById.set(conversation.id, flags[index]));
      }
      const rows: ConversationItem[] = [];
      conversations.forEach((conversation, index) => {
        const otherId = getOtherDmParticipant(conversation, userId);
        if (!otherId) return;
        const last = latestPages[index];
        rows.push({
          conversation,
          otherUserId: otherId,
          profile: profilesById.get(otherId) ?? null,
          latest: last,
          unread: unreadById.get(conversation.id) ?? false,
        });
      });
      setItems(rows);
      setError(null);
    } catch (cause) {
      if (current !== generation.current) return;
      if (!silent) {
        setError(cause instanceof Error ? cause.message : 'Unable to load messages.');
      }
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  // The inbox contains only conversations with message history. Opening a chat
  // without sending a message must not automatically populate this section.
  const startedConversations = useMemo(
    () => items.filter((item) => item.latest !== null),
    [items]
  );

  // Load mutually-followed, unblocked accounts once per screen focus, not once
  // per search keystroke. The database validates eligibility again on opening.
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!DM_NAV_ENABLED || !userId) {
      setEligiblePeople([]);
      setPeopleLoading(false);
      setPeopleError(null);
      return () => { active = false; };
    }
    setPeopleLoading(true);
    setPeopleError(null);
    void (async () => {
      try {
        const ids = await listDmShareRecipientIds();
        const profiles = ids.length ? await getProfilesByIds(ids) : [];
        if (active) setEligiblePeople(profiles);
      } catch (cause) {
        if (active) {
          setEligiblePeople([]);
          setPeopleError(
            cause instanceof Error ? cause.message : 'Unable to load people.'
          );
        }
      } finally {
        if (active) setPeopleLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]));

  // Suggestions include eligible people with no chat and eligible people whose
  // chat exists but has no messages. Neither group belongs in Conversations.
  const peopleWithoutMessages = useMemo(() => {
    const chattedWith = new Set(startedConversations.map((item) => item.otherUserId));
    return eligiblePeople.filter((person) => !chattedWith.has(person.id))
      .sort((a, b) =>
        (a.displayName || a.username).localeCompare(b.displayName || b.username)
      );
  }, [eligiblePeople, startedConversations]);
  const suggestedPeople = peopleWithoutMessages.slice(0, 5);

  // Search the inbox by participant and message bodies across RLS-visible chats.
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingConversations = useMemo(() => {
    if (!normalizedQuery) return startedConversations;
    return startedConversations.filter((item) => {
      const name = item.profile?.displayName ?? '';
      const handle = item.profile?.username ?? '';
      return name.toLocaleLowerCase().includes(normalizedQuery) ||
        handle.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [startedConversations, normalizedQuery]);

  const matchingPeople = useMemo(() => {
    if (!DM_NAV_ENABLED || normalizedQuery.length < 2) return [];
    return peopleWithoutMessages.filter((person) =>
      (person.displayName ?? '').toLocaleLowerCase().includes(normalizedQuery) ||
      person.username.toLocaleLowerCase().includes(normalizedQuery)
    ).slice(0, 20);
  }, [peopleWithoutMessages, normalizedQuery]);

  async function startConversation(person: UserProfile) {
    if (!DM_NAV_ENABLED || openingPersonId || !userId) return;
    setOpeningPersonId(person.id);
    setPeopleError(null);
    try {
      // This RPC independently checks mutual follows and blocks; existing
      // conversations are returned rather than duplicated.
      const conversationId = await openDmConversation(person.id);
      router.push({ pathname: '/dm-conversation', params: { conversationId } });
    } catch (cause) {
      setPeopleError(cause instanceof Error ? cause.message : 'Unable to open conversation.');
    } finally {
      setOpeningPersonId(null);
    }
  }

  useEffect(() => {
    let active = true;
    setMatchedMessages([]);
    setSearchError(null);
    if (!userId || normalizedQuery.length < 2) {
      setSearching(false);
      return () => { active = false; };
    }
    setSearching(true);
    const pending = setTimeout(() => {
      void (async () => {
        try {
          const matches = await searchDmMessages(query, 40);
          const conversations = await getDmConversationsByIds(
            matches.map((match) => match.conversation_id)
          );
          const byConversation = new Map(conversations.map((row) => [row.id, row]));
          const people = conversations
            .map((row) => getOtherDmParticipant(row, userId))
            .filter((id): id is string => Boolean(id));
          const profiles = people.length ? await getProfilesByIds(people) : [];
          const byPerson = new Map(profiles.map((profile) => [profile.id, profile]));
          const results: SearchMessageItem[] = [];
          for (const message of matches) {
            const conversation = byConversation.get(message.conversation_id);
            const otherId = conversation && getOtherDmParticipant(conversation, userId);
            if (!otherId) continue;
            const profile = byPerson.get(otherId);
            results.push({
              message,
              otherName: profile?.displayName || profile?.username || 'Top 3 member',
              otherAvatarUrl: profile?.avatarUrl,
            });
          }
          if (active) setMatchedMessages(results);
        } catch (cause) {
          if (active) setSearchError(
            cause instanceof Error ? cause.message : 'Unable to search messages.'
          );
        } finally {
          if (active) setSearching(false);
        }
      })();
    }, 300);
    return () => { active = false; clearTimeout(pending); };
  }, [query, normalizedQuery, userId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (!active || AppState.currentState !== 'active') return;
      if (pending !== null) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        if (active) void refresh(false, true);
      }, 200);
    };

    // One subscriber covers new conversations and activity in every chat.
    // Row-level security allows only conversations involving this account.
    const unsubscribeConversations = userId ? subscribeToTableChanges({
      channelName: `dm-inbox-${userId}`,
      table: 'dm_conversations',
      events: ['INSERT', 'UPDATE'],
      onChange: scheduleRefresh,
      onSubscribed: scheduleRefresh,
    }) : () => {};

    // Only the current account's read positions are published. This also
    // synchronizes unread dots when a second signed-in device reads a chat.
    const unsubscribeReadStates = userId ? subscribeToTableChanges({
      channelName: `dm-read-states-${userId}`,
      table: 'dm_read_states',
      filter: `user_id=eq.${userId}`,
      events: ['INSERT', 'UPDATE'],
      onChange: scheduleRefresh,
      onSubscribed: scheduleRefresh,
    }) : () => {};

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleRefresh();
    });
    void refresh();
    return () => {
      active = false;
      if (pending !== null) clearTimeout(pending);
      generation.current += 1;
      unsubscribeConversations();
      unsubscribeReadStates();
      appState.remove();
    };
  }, [userId, refresh]));

  // Keep the large section title and search in the same scroll surface as
  // the conversations. The wordmark and its navigation controls roll away.
  const listHeading = (
    <>
      <PageHeader title="Messages" />
      <View style={styles.searchWrapper}>
        <SearchInput
          borderless
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search people and messages"
          accessibilityLabel="Search people, conversations and messages"
        />
      </View>
    </>
  );

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
          overlay
          featheredBackdrop
          androidStatusBarGlass
          rightIconName="create-outline"
          rightAccessibilityLabel="New message"
          onRightPress={() => router.push('/dm-new-conversation')}
        />
      </Reanimated.View>
      {loading && !refreshing ? (
        <View style={[styles.fallback, { paddingTop: insets.top + SCREEN_HEADER_HEIGHT }]}>
          {listHeading}
          <View style={styles.state}>
            <ActivityIndicator color={colors.tertiaryText} />
          </View>
        </View>
      ) : error ? (
        <View style={[styles.fallback, { paddingTop: insets.top + SCREEN_HEADER_HEIGHT }]}>
          {listHeading}
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.tertiaryText} />
            <AppText variant="body" style={styles.stateText}>{error}</AppText>
            <Pressable onPress={() => void refresh()} accessibilityRole="button">
              <AppText variant="action">Try again</AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Reanimated.FlatList
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          data={normalizedQuery ? matchingConversations : startedConversations}
          ListHeaderComponent={
            <>
              {listHeading}
              {GROUP_DM_ENABLED ? <GroupDmInboxSection userId={userId} searchQuery={query} refreshing={refreshing} /> : null}
              {(!normalizedQuery || matchingConversations.length > 0) ? (
                <AppText variant="sectionTitle" style={styles.conversationsHeading}>
                  Conversations
                </AppText>
              ) : null}
              {!normalizedQuery && startedConversations.length === 0 ? (
                <AppText variant="body" tone="secondary" style={styles.noConversationsHint}>
                  No conversations yet.
                </AppText>
              ) : null}
            </>
          }
          keyExtractor={(item) => item.conversation.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.list,
            { paddingTop: insets.top + SCREEN_HEADER_HEIGHT },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh(true)}
              tintColor={colors.tertiaryText}
            />
          }
          renderItem={({ item }) => {
            const name = item.profile?.displayName || item.profile?.username || 'Top 3 member';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open conversation with ${name}`}
                onPress={() => router.push({
                  pathname: '/dm-conversation',
                  params: { conversationId: item.conversation.id },
                })}
                style={({ pressed }) => [
                  styles.row,
                  styles.conversationCard,
                  { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                ]}>
                <UserAvatar displayName={name} avatarUrl={item.profile?.avatarUrl} size={52} />
                <View style={styles.rowContent}>
                  <AppText variant="selectionTitle" numberOfLines={1} style={styles.name}>
                    {name}
                  </AppText>
                  <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                    {item.latest ? relativeTime(item.latest.created_at) : 'Start a conversation'}
                  </AppText>
                </View>
                {item.unread ? (
                  <View
                    accessibilityLabel="Unread message"
                    style={[styles.unreadDot, { backgroundColor: colors.accent }]}
                  />
                ) : null}
              </Pressable>
            );
          }}
          ListFooterComponent={!normalizedQuery ? (
            <View>
              <View style={styles.suggestionsHeading}>
                <AppText variant="sectionTitle">Start a conversation</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="See all people you can message"
                  onPress={() => router.push('/dm-new-conversation')}
                  hitSlop={10}>
                  <AppText variant="label"><Text style={{ color: colors.accent }}>See all</Text></AppText>
                </Pressable>
              </View>
              {peopleLoading ? (
                <View style={styles.suggestionsState}>
                  <ActivityIndicator color={colors.tertiaryText} />
                </View>
              ) : peopleError ? (
                <AppText variant="body" tone="secondary" style={styles.suggestionsState}>
                  {peopleError}
                </AppText>
              ) : suggestedPeople.length ? (
                suggestedPeople.map((person) => {
                  const name = person.displayName || person.username;
                  return (
                    <Pressable
                      key={person.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Start conversation with ${name}`}
                      disabled={openingPersonId !== null}
                      onPress={() => { void startConversation(person); }}
                      style={({ pressed }) => [
                        styles.row,
                        styles.conversationCard,
                        { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                      ]}>
                      <UserAvatar displayName={name} avatarUrl={person.avatarUrl} size={52} />
                      <View style={styles.rowContent}>
                        <AppText variant="selectionTitle" numberOfLines={1} style={styles.name}>
                          {name}
                        </AppText>
                        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                          @{person.username}
                        </AppText>
                      </View>
                      {openingPersonId === person.id ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.accent} />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <AppText variant="body" tone="secondary" style={styles.suggestionsState}>
                  No additional mutual followers to message yet.
                </AppText>
              )}
            </View>
          ) : (
            <View style={styles.searchResults}>
              <AppText variant="sectionTitle">People you can message</AppText>
              {normalizedQuery.length < 2 ? (
                <AppText variant="body" tone="secondary">Enter at least 2 characters to find people.</AppText>
              ) : peopleLoading ? (
                <ActivityIndicator color={colors.tertiaryText} />
              ) : peopleError ? (
                <AppText variant="body" tone="secondary">{peopleError}</AppText>
              ) : matchingPeople.length ? (
                matchingPeople.map((person) => {
                  const name = person.displayName || person.username;
                  return (
                    <Pressable
                      key={person.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Start conversation with ${name}`}
                      disabled={openingPersonId !== null}
                      onPress={() => { void startConversation(person); }}
                      style={[styles.row, styles.peopleRow, { borderBottomColor: colors.border }]}
                    >
                      <UserAvatar displayName={name} avatarUrl={person.avatarUrl} size={40} />
                      <View style={styles.rowContent}>
                        <AppText variant="label" numberOfLines={1}>{name}</AppText>
                        <AppText variant="body" tone="secondary" numberOfLines={1}>@{person.username}</AppText>
                      </View>
                      {openingPersonId === person.id ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <AppText variant="body" tone="secondary">No additional mutual followers match.</AppText>
              )}
              <AppText variant="sectionTitle" style={styles.messageSectionHeading}>Matching messages</AppText>
              {normalizedQuery.length < 2 ? (
                <AppText variant="body" tone="secondary">Enter at least 2 characters to search message text.</AppText>
              ) : searching ? (
                <ActivityIndicator color={colors.tertiaryText} />
              ) : searchError ? (
                <AppText variant="body" tone="secondary">{searchError}</AppText>
              ) : matchedMessages.length ? (
                matchedMessages.map((result) => (
                  <Pressable
                    key={result.message.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open matched message with ${result.otherName}`}
                    onPress={() => router.push({
                      pathname: '/dm-conversation',
                      params: {
                        conversationId: result.message.conversation_id,
                        focusMessageId: result.message.id,
                      },
                    })}
                    style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <UserAvatar displayName={result.otherName} avatarUrl={result.otherAvatarUrl ?? undefined} size={40} />
                    <View style={styles.rowContent}>
                      <AppText variant="label" numberOfLines={1}>{result.otherName}</AppText>
                      <AppText variant="body" tone="secondary" numberOfLines={2}>{result.message.body}</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.tertiaryText} />
                  </Pressable>
                ))
              ) : (
                <AppText variant="body" tone="secondary">No matching messages.</AppText>
              )}
            </View>
          )}
          ListEmptyComponent={null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  fallback: { flex: 1 },
  list: { paddingTop: 10, paddingBottom: 24 },
  searchWrapper: { paddingHorizontal: 20, paddingVertical: 10 },
  searchResults: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 14 },
  peopleRow: { paddingHorizontal: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  messageSectionHeading: { marginTop: 10 },
  conversationsHeading: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  noConversationsHint: { paddingHorizontal: 20, paddingBottom: 12 },
  suggestionsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  suggestionsState: { paddingHorizontal: 20, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  conversationCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
    borderRadius: 18,
  },
  rowContent: { flex: 1, gap: 4 },
  name: { flexShrink: 1 },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  stateText: { textAlign: 'center' },
});
