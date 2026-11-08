import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import CreateCollectionScreen from '@/components/create-collection-screen';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import Reanimated from 'react-native-reanimated';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';
import { useCollectionOptions } from '@/context/collection-options-context';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { useFollow } from '@/context/follow-context';
import { getProfileById } from '@/lib/supabase/profiles';
import { sendTop3Request } from '@/lib/supabase/top3-requests';
import { resolveNotificationCollection } from '@/utils/resolve-notification-collection';
import type { NotificationDestination } from '@/types/notification-destination';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RequestTop3Screen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  // Match the Notification Composer's safe-area-aware, collapsible Top3 header.
  const ignoreScroll = useCallback((_y: number) => {}, []);
  const ignoreScrolled = useCallback((_scrolled: boolean) => {}, []);
  const { scrollHandler, headerStyle } = useHomeStickyHeader(ignoreScroll, ignoreScrolled);
  const params = useLocalSearchParams<{
    userId?: string | string[];
    categoryId?: string | string[];
    kind?: string | string[];
    optionId?: string | string[];
  }>();
  const param = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const userId = param(params.userId);
  const categoryId = param(params.categoryId);
  const kind = param(params.kind);
  const optionId = param(params.optionId);
  const { isFollowing } = useFollow();
  const { options } = useCollectionOptions();
  const [name, setName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sentRequestKey, setSentRequestKey] = useState<string | null>(null);
  const recipient = userId ?? '';
  const requestKey = [recipient, categoryId ?? '', kind ?? '', optionId ?? ''].join(':');
  const requestSent = sentRequestKey === requestKey;
  const validCategory = TOP3_CATEGORIES.some(
    (category) => category.id === categoryId
  );
  const destination: NotificationDestination | null = validCategory
    ? kind === 'overall'
      ? { categoryId: categoryId as NotificationDestination['categoryId'], kind }
      : (kind === 'type' || kind === 'theme' || kind === 'genre') && optionId
        ? { categoryId: categoryId as NotificationDestination['categoryId'], kind, optionId }
        : null
    : null;
  const eligible = Boolean(recipient && isFollowing(recipient));
  useEffect(() => {
    let active = true;
    if (recipient) void getProfileById(recipient).then((profile) => {
      if (active) setName(profile?.displayName ?? profile?.username ?? 'this person');
    }).catch(() => { if (active) setName('this person'); });
    return () => { active = false; };
  }, [recipient]);
  const input = destination
    ? resolveNotificationCollection(destination, options, { includePodcasts: true })
    : null;
  async function submit() {
    if (!recipient || !destination || !input || sending || requestSent || !eligible) return;
    setSending(true);
    try {
      await sendTop3Request(recipient, destination);
      setSentRequestKey(requestKey);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Try again later.');
    } finally { setSending(false); }
  }
  // Reuse the actual Create category cards. A request selection never creates
  // or changes one of the requester's own lists.
  if (!destination) {
    return <CreateCollectionScreen requestUserId={recipient} />;
  }
  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      edges={['left', 'right', 'bottom']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          styles.floatingHeader,
          { height: insets.top + SCREEN_HEADER_HEIGHT + 16 },
          headerStyle,
        ]}>
        <ScreenHeader
          showBackButton
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>

      <Reanimated.ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SCREEN_HEADER_HEIGHT },
        ]}>
        <View style={styles.intro}>
          <AppText variant="pageTitle">Send a request</AppText>
          <AppText variant="body">
            Ask {name ?? 'someone you follow'} to share their favourites.
          </AppText>
        </View>

        {!eligible ? (
          <AppText variant="body" tone="tertiary" style={styles.followHint}>
            Follow this person before sending a request.
          </AppText>
        ) : null}

        <View style={styles.field}>
          <AppText variant="formLabel">Requested Top 3</AppText>
          <View style={[styles.topic, { backgroundColor: colors.surface }]}>
            <AppText variant="body">{input?.title ?? 'Selected topic unavailable'}</AppText>
          </View>
          <AppText variant="metadata" tone="tertiary">
            Use Back to choose a different topic.
          </AppText>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={requestSent ? 'Request sent' : sending ? 'Sending request…' : 'Send request'}
            disabled={!eligible || !input || sending || requestSent}
            onPress={() => { void submit(); }}
          />
          <AppText variant="metadata" tone="tertiary" style={styles.footerHint}>
            They can create a new Top 3, share one they've already made, or dismiss your request.
          </AppText>
        </View>
      </Reanimated.ScrollView>
      <ActionSheet
        visible={requestError !== null}
        title="Unable to send request"
        message={requestError ?? undefined}
        actions={[{ label: 'OK', onPress: () => setRequestError(null) }]}
        onClose={() => setRequestError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 48,
  },
  intro: {
    gap: SPACING.sm,
    paddingTop: SPACING.md,
  },
  followHint: { marginTop: SPACING.lg },
  field: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  topic: {
    minHeight: 52,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  actions: {
    marginTop: 30,
    gap: SPACING.md,
  },
  footerHint: { textAlign: 'center' },
});
