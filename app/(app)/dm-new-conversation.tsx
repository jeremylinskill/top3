import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import { listDmShareRecipientIds, openDmConversation } from '@/lib/supabase/direct-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
import type { UserProfile } from '@/types/user-profile';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewDmConversationScreen() {
  const colors = useAppColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reuse the existing server-validated mutual-follow recipient list; opening
  // a conversation is still independently guarded by dm_create_conversation.
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!DM_NAV_ENABLED || !userId) {
      setPeople([]);
      setLoading(false);
      setError('Messaging is unavailable.');
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const ids = await listDmShareRecipientIds();
        const profiles = ids.length ? await getProfilesByIds(ids) : [];
        if (!active) return;
        const byId = new Map(profiles.map((profile) => [profile.id, profile]));
        setPeople(ids.map((id) => byId.get(id)).filter(
          (profile): profile is UserProfile => Boolean(profile)
        ).sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username)));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load people.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]));

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return people;
    return people.filter((profile) =>
      (profile.displayName || '').toLocaleLowerCase().includes(term) ||
      profile.username.toLocaleLowerCase().includes(term)
    );
  }, [people, query]);

  async function startConversation(profile: UserProfile) {
    if (!DM_NAV_ENABLED || openingId || !userId) return;
    setOpeningId(profile.id);
    setError(null);
    try {
      const conversationId = await openDmConversation(profile.id);
      router.replace({
        pathname: '/dm-conversation',
        params: { conversationId },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open conversation.');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="New Message" />
      <View style={styles.searchWrapper}>
        <SearchInput
          borderless
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search people you follow"
          accessibilityLabel="Search people to message"
        />
        <AppText variant="body" tone="secondary" style={styles.hint}>
          You can start a conversation with someone you follow who follows you back.
        </AppText>
      </View>
      {error ? (
        <AppText variant="body" tone="secondary" style={styles.error}>{error}</AppText>
      ) : null}
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(profile) => profile.id}
          contentContainerStyle={filtered.length ? styles.list : styles.emptyList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const name = item.displayName || item.username;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Start conversation with ${name}`}
                disabled={openingId !== null}
                onPress={() => { void startConversation(item); }}
                style={[styles.row, { borderBottomColor: colors.border }]}>
                <UserAvatar displayName={name} avatarUrl={item.avatarUrl} size={46} />
                <View style={styles.profileText}>
                  <AppText variant="label" numberOfLines={1}>{name}</AppText>
                  <AppText variant="body" tone="secondary" numberOfLines={1}>@{item.username}</AppText>
                </View>
                {openingId === item.id ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Ionicons name="chevron-forward" color={colors.tertiaryText} size={18} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.state}>
              <Ionicons name="people-outline" size={36} color={colors.tertiaryText} />
              <AppText variant="body" tone="secondary" style={styles.emptyText}>
                {query.trim() ? 'No matching people.' : 'No mutual followers available to message yet.'}
              </AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchWrapper: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 10 },
  hint: { paddingTop: 2 },
  error: { paddingHorizontal: 20, paddingBottom: 10 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  emptyText: { textAlign: 'center' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  profileText: { flex: 1, gap: 4 },
});
