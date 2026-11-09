import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import SearchInput from '@/components/search-input';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { GROUP_DM_ENABLED } from '@/lib/dm-availability';
import { listDmShareRecipientIds } from '@/lib/supabase/direct-messages';
import { createGroup } from '@/lib/supabase/group-messages';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewDmGroupScreen() {
  const colors = useAppColors();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!GROUP_DM_ENABLED || !userId) {
      setLoading(false);
      setError('Group messaging is unavailable.');
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const ids = await listDmShareRecipientIds();
        const profiles = ids.length ? await getProfilesByIds(ids) : [];
        if (!active) return;
        const byId = new Map(profiles.map((person) => [person.id, person]));
        setPeople(ids.map((id) => byId.get(id)).filter(
          (person): person is UserProfile => Boolean(person)
        ).sort((a, b) =>
          (a.displayName || a.username).localeCompare(b.displayName || b.username)
        ));
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
    return people.filter((person) =>
      (person.displayName || '').toLocaleLowerCase().includes(term) ||
      person.username.toLocaleLowerCase().includes(term)
    );
  }, [people, query]);

  const groupName = name.trim();
  const canCreate = GROUP_DM_ENABLED && !loading && !creating &&
    groupName.length > 0 && groupName.length <= 80 &&
    selectedIds.length >= 2 && selectedIds.length <= 9;

  function togglePerson(id: string) {
    if (creating) return;
    setError(null);
    setSelectedIds((ids) => ids.includes(id)
      ? ids.filter((selected) => selected !== id)
      : ids.length < 9 ? [...ids, id] : ids
    );
  }

  async function submit() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const groupId = await createGroup(groupName, selectedIds);
      router.replace({ pathname: '/dm-group-conversation', params: { groupId } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the group.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="New Group" />
      {!GROUP_DM_ENABLED ? (
        <View style={styles.state}>
          <AppText variant="body" tone="secondary">Group messaging is unavailable.</AppText>
        </View>
      ) : (
        <>
          <View style={styles.fields}>
            <AppText variant="label">Group name</AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={80}
              placeholder="Give your group a name"
              placeholderTextColor={colors.tertiaryText}
              accessibilityLabel="Group name"
              style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surface }]}
            />
            <AppText variant="body" tone="secondary">
              Choose 2–9 people who follow you back. Everyone must accept their invitation.
            </AppText>
            <SearchInput borderless value={query} onChangeText={setQuery}
              onClear={() => setQuery('')} placeholder="Search people"
              accessibilityLabel="Search people to invite" />
            <AppText variant="label">{selectedIds.length} of 9 selected · 2 minimum</AppText>
            {error ? <AppText variant="body" style={{ color: colors.accent }}>{error}</AppText> : null}
          </View>
          {loading ? (
            <View style={styles.state}><ActivityIndicator color={colors.accent} /></View>
          ) : (
            <FlatList
              data={filtered}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(person) => person.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const displayName = item.displayName || item.username;
                const selected = selectedIds.includes(item.id);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: creating || (!selected && selectedIds.length >= 9) }}
                    accessibilityLabel={`Invite ${displayName}`}
                    disabled={creating || (!selected && selectedIds.length >= 9)}
                    onPress={() => togglePerson(item.id)}
                    style={[styles.row, { borderBottomColor: colors.border }]}>
                    <UserAvatar displayName={displayName} avatarUrl={item.avatarUrl} size={44} />
                    <View style={styles.profileText}>
                      <AppText variant="label" numberOfLines={1}>{displayName}</AppText>
                      <AppText variant="body" tone="secondary" numberOfLines={1}>
                        @{item.username}
                      </AppText>
                    </View>
                    <Ionicons name={selected ? 'checkbox' : 'square-outline'}
                      size={24} color={selected ? colors.accent : colors.tertiaryText} />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.state}>
                  <AppText variant="body" tone="secondary" style={styles.centerText}>
                    {query.trim() ? 'No matching people.' : 'No mutual followers available yet.'}
                  </AppText>
                </View>
              }
            />
          )}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create group and send invitations"
              disabled={!canCreate}
              onPress={() => void submit()}
              style={[styles.button, { backgroundColor: colors.accent, opacity: canCreate ? 1 : 0.45 }]}>
              {creating ? <ActivityIndicator color="#151515" /> : (
                <AppText variant="label" tone="onPrimary">Create Group</AppText>
              )}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fields: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 10 },
  nameInput: { borderRadius: 12, minHeight: 50, paddingHorizontal: 14, fontSize: 16 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 22 },
  centerText: { textAlign: 'center' },
  list: { flexGrow: 1, paddingBottom: 24 },
  row: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  profileText: { flex: 1, gap: 3 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 12 },
});
