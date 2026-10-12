import AppText from '@/components/app-text';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { RADIUS } from '@/constants/radius';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  getNotificationCampaignHistory,
  type NotificationCampaign,
  type NotificationCampaignStatus,
} from '@/lib/supabase/notification-campaigns';
import type { CollectionOption } from '@/types/collection-option';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const STATUS_LABELS: Record<
  NotificationCampaignStatus,
  string
> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getDestinationLabel(
  campaign: NotificationCampaign,
  options: readonly CollectionOption[]
): string {
  const category =
    TOP3_CATEGORIES.find(
      (item) => item.id === campaign.categoryId
    )?.name ?? campaign.categoryId;

  if (campaign.destinationKind === 'overall') {
    return `${category} · Overall`;
  }

  const kind =
    campaign.destinationKind === 'type'
      ? 'Type'
      : 'Theme';

  const option = options.find(
    (item) =>
      item.id === campaign.optionId &&
      item.categoryId === campaign.categoryId &&
      item.kind === campaign.destinationKind
  );

  return `${category} · ${kind} · ${
    option?.name ?? 'Previous selection'
  }`;
}

export default function NotificationHistory() {
  const colors = useAppColors();
  const { options } = useCollectionOptions();

  const mountedRef = useRef(false);

  const [campaigns, setCampaigns] = useState<
    NotificationCampaign[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] = useState<string | null>(
    null
  );
  const [expandedId, setExpandedId] = useState<
    string | null
  >(null);

  useEffect(() => {
    mountedRef.current = true;

    void getNotificationCampaignHistory()
      .then((results) => {
        if (!mountedRef.current) {
          return;
        }

        setCampaigns(results);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!mountedRef.current) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load notification history.'
        );
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function refreshHistory() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const results =
        await getNotificationCampaignHistory();

      if (!mountedRef.current) {
        return;
      }

      setCampaigns(results);
      setError(null);
    } catch (reason) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to refresh notification history.'
      );
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refreshHistory();
          }}
          tintColor={colors.accent}
        />
      }>
      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="body">
            Loading notification history…
          </AppText>
        </View>
      ) : null}

      {error ? (
        <View
          style={[
            styles.state,
            {
              backgroundColor: colors.secondarySurface,
            },
          ]}>
          <AppText variant="body" tone="destructive">
            {error}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void refreshHistory();
            }}>
            <AppText variant="action">
              Try Again
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {!isLoading &&
      campaigns.length === 0 &&
      !error ? (
        <View style={styles.state}>
          <Ionicons
            name="notifications-outline"
            size={32}
            color={colors.tertiaryText}
          />
          <AppText variant="sectionTitle">
            No notifications yet
          </AppText>
          <AppText variant="body" style={styles.center}>
            Notifications you send or schedule will
            appear here.
          </AppText>
        </View>
      ) : null}

      {campaigns.map((campaign) => {
        const isExpanded =
          expandedId === campaign.id;

        const primaryTimestamp =
          campaign.sentAt ??
          campaign.scheduledAt ??
          campaign.createdAt;

        const showCreatedDate =
          Math.abs(
            new Date(primaryTimestamp).getTime() -
            new Date(campaign.createdAt).getTime()
          ) >= 60000;

        return (
          <View
            key={campaign.id}
            style={[
              styles.card,
              { backgroundColor: colors.surface },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                expanded: isExpanded,
              }}
              accessibilityLabel={`View notification: ${campaign.title}`}
              onPress={() => {
                setExpandedId(
                  isExpanded ? null : campaign.id
                );
              }}
              style={styles.cardHeader}>
              <View style={styles.cardText}>
                <View style={styles.headerMetaRow}>
                  <AppText
                    variant="metadata"
                    style={styles.headerTimestamp}
                    tone={
                      campaign.status === 'failed'
                        ? 'destructive'
                        : 'tertiary'
                    }>
                    {formatShortDate(primaryTimestamp)}
                    {' · '}
                    {campaign.audience === 'test'
                      ? 'Test'
                      : 'All users'}
                    {' · '}
                    {STATUS_LABELS[campaign.status]}
                  </AppText>

                  <Ionicons
                    name={
                      isExpanded
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={20}
                    color={colors.secondaryText}
                  />
                </View>

                <AppText variant="label" tone="secondary">
                  {getDestinationLabel(
                    campaign,
                    options
                  )}
                </AppText>

                <AppText
                  variant="cardTitle"
                  tone="primary">
                  {campaign.title}
                </AppText>
              </View>
            </Pressable>

            {isExpanded ? (
              <View
                style={[
                  styles.details,
                  { borderTopColor: colors.border },
                ]}>
                <AppText variant="body">
                  {campaign.message}
                </AppText>

                {showCreatedDate ? (
                  <AppText variant="metadata">
                    Created: {formatDate(campaign.createdAt)}
                  </AppText>
                ) : null}

                {campaign.scheduledAt &&
                campaign.status !== 'scheduled' ? (
                  <AppText variant="metadata">
                    Scheduled for: {formatDate(campaign.scheduledAt)}
                  </AppText>
                ) : null}

                <AppText variant="metadata">
                  Expo accepted: {campaign.acceptedCount}
                  {' of '}
                  {campaign.targetCount}
                  {campaign.failedCount > 0
                    ? ` · ${campaign.failedCount} failed`
                    : ''}
                </AppText>



                {campaign.lastError ? (
                  <AppText
                    variant="body"
                    tone="destructive">
                    {campaign.lastError}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}


      {campaigns.some(
        (campaign) => campaign.acceptedCount > 0
      ) ? (
        <AppText
          variant="metadata"
          style={styles.footnote}>
          Expo acceptance does not confirm device delivery.
        </AppText>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 12,
    flexGrow: 1,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    borderRadius: RADIUS.lg,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 7,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTimestamp: {
    flex: 1,
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  footnote: {
    textAlign: 'center',
    marginTop: 12,
  },
});
