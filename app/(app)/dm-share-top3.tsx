import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import ScreenHeader from '@/components/screen-header';
import UserAvatar from '@/components/user-avatar';
import { useAppColors } from '@/hooks/use-app-colors';
import { useAuth } from '@/hooks/use-auth';
import { DM_NAV_ENABLED } from '@/lib/dm-availability';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  getDmSharedCollectionPreviews,
  listDmShareRecipientIds,
  shareDmCollection,
} from '@/lib/supabase/direct-messages';
import { getProfilesByIds } from '@/lib/supabase/profiles';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!DM_NAV_ENABLED || !user?.id || !collectionId) {
      setLoading(false);
      setError('Sharing in Top 3 is not available.');
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader showBackButton centerTitle="Send Top 3" />
      <View style={styles.intro}>
        <AppText variant="label">{title || 'Share a Top 3'}</AppText>
        <AppText variant="body" tone="secondary">
          Choose someone you mutually follow.
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
            <View style={styles.center}>
              <AppText variant="body" tone="secondary" style={styles.centerText}>
                No mutual followers available to message yet.
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
});
