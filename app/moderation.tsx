import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { TYPOGRAPHY } from '@/constants/typography';
import {
    dismissReport,
    getPendingReports,
    ModerationReport,
    removeReportedContent,
} from '@/lib/supabase/moderation';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatTargetType(
  targetType: ModerationReport['targetType']
) {
  switch (targetType) {
    case 'user':
      return 'User';

    case 'post':
      return 'List';

    case 'comment':
      return 'Comment';
  }
}

function formatReason(reason: string) {
  switch (reason) {
    case 'spam':
      return 'Spam';

    case 'harassment':
      return 'Harassment or bullying';

    case 'hate_or_abuse':
      return 'Hate or abusive content';

    case 'inappropriate_content':
      return 'Inappropriate content';

    case 'impersonation':
      return 'Impersonation';

    case 'other':
      return 'Other';

    default:
      return reason;
  }
}

function formatReportDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDisplayName(
  profile: ModerationReport['reportedUser']
) {
  return (
    profile?.displayName ??
    profile?.username ??
    'Unknown user'
  );
}

function getUsername(
  profile: ModerationReport['reportedUser']
) {
  if (!profile?.username) {
    return null;
  }

  return `@${profile.username}`;
}

function getReportedContentLabel(
  report: ModerationReport
) {
  if (!report.reportedContent) {
    return null;
  }

  if (
    report.reportedContent.type === 'comment'
  ) {
    return 'Reported comment';
  }

  return 'Reported list';
}

type ReportCardProps = {
  report: ModerationReport;
  isDismissing: boolean;
  isRemovingContent: boolean;
  onDismiss: (report: ModerationReport) => void;
  onRemoveContent: (report: ModerationReport) => void;
};

function ReportCard({
  report,
  isDismissing,
  isRemovingContent,
  onDismiss,
  onRemoveContent,
}: ReportCardProps) {
  const reportedUserName =
    getDisplayName(report.reportedUser);

  const reportedUsername =
    getUsername(report.reportedUser);

  const reporterName =
    getDisplayName(report.reporter);

  const reporterUsername =
    getUsername(report.reporter);

  const reportedContentLabel =
    getReportedContentLabel(report);

  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportHeaderText}>
          <Text style={styles.reportTargetType}>
            {formatTargetType(
              report.targetType
            )}
          </Text>

          <Text style={styles.reportDate}>
            {formatReportDate(
              report.createdAt
            )}
          </Text>
        </View>

        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>
            Pending
          </Text>
        </View>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>
          Reported user
        </Text>

        <Text style={styles.reportPrimaryText}>
          {reportedUserName}
        </Text>

        {reportedUsername ? (
          <Text style={styles.reportSecondaryText}>
            {reportedUsername}
          </Text>
        ) : null}
      </View>

      {reportedContentLabel ? (
        <>
          <View style={styles.divider} />

          <View style={styles.reportSection}>
            <Text style={styles.reportLabel}>
              {reportedContentLabel}
            </Text>

            {report.reportedContent?.type ===
            'comment' ? (
              <Text
                style={
                  styles.reportContentText
                }>
                {report.reportedContent.content}
              </Text>
            ) : report.reportedContent?.type ===
              'post' ? (
              <>
                <Text
                  style={
                    styles.reportPrimaryText
                  }>
                  {report.reportedContent.title}
                </Text>

                <Text
                  style={
                    styles.reportSecondaryText
                  }>
                  {[
                    report.reportedContent
                      .category,
                    report.reportedContent.topic,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>
          Reported by
        </Text>

        <Text style={styles.reportPrimaryText}>
          {reporterName}
        </Text>

        {reporterUsername ? (
          <Text style={styles.reportSecondaryText}>
            {reporterUsername}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.reportSection}>
        <Text style={styles.reportLabel}>
          Reason
        </Text>

        <Text style={styles.reportPrimaryText}>
          {formatReason(report.reason)}
        </Text>

        {report.details ? (
          <Text style={styles.reportDetails}>
            {report.details}
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.actionSection}>
        {report.targetType !== 'user' ? (
          <Pressable
            style={({ pressed }) => [
              styles.removeContentButton,
              pressed &&
                !isRemovingContent &&
                !isDismissing &&
                styles.removeContentButtonPressed,
              (isRemovingContent ||
                isDismissing) &&
                styles.actionButtonDisabled,
            ]}
            onPress={() =>
              onRemoveContent(report)
            }
            disabled={
              isRemovingContent ||
              isDismissing
            }
            accessibilityRole="button"
            accessibilityLabel="Remove reported content">
            {isRemovingContent ? (
              <ActivityIndicator
                size="small"
                color="#FF3B30"
              />
            ) : (
              <Text
                style={
                  styles.removeContentButtonText
                }>
                Remove Content
              </Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            report.targetType !== 'user' &&
              styles.dismissButtonWithSpacing,
            pressed &&
              !isDismissing &&
              !isRemovingContent &&
              styles.dismissButtonPressed,
            (isDismissing ||
              isRemovingContent) &&
              styles.actionButtonDisabled,
          ]}
          onPress={() => onDismiss(report)}
          disabled={
            isDismissing ||
            isRemovingContent
          }
          accessibilityRole="button"
          accessibilityLabel="Dismiss report">
          {isDismissing ? (
            <ActivityIndicator
              size="small"
              color={COLORS.text}
            />
          ) : (
            <Text
              style={
                styles.dismissButtonText
              }>
              Dismiss Report
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function ModerationScreen() {
  const [reports, setReports] = useState<
    ModerationReport[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [dismissingReportId, setDismissingReportId] =
    useState<string | null>(null);

  const [
    removingContentReportId,
    setRemovingContentReportId,
  ] = useState<string | null>(null);

  const loadReports = useCallback(
    async ({
      refreshing = false,
    }: {
      refreshing?: boolean;
    } = {}) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setLoadError(null);

      try {
        const pendingReports =
          await getPendingReports();

        setReports(pendingReports);
      } catch (error) {
        console.error(
          'Failed to load moderation reports:',
          error
        );

        setLoadError(
          'The pending moderation reports could not be loaded.'
        );
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleDismissReport = useCallback(
    (report: ModerationReport) => {
      if (
        dismissingReportId ||
        removingContentReportId
      ) {
        return;
      }

      Alert.alert(
        'Dismiss report?',
        'This will mark the report as dismissed. The reported user and content will not be changed.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Dismiss Report',
            onPress: () => {
              void (async () => {
                setDismissingReportId(
                  report.id
                );

                try {
                  await dismissReport(
                    report.id
                  );

                  setReports(
                    (currentReports) =>
                      currentReports.filter(
                        (currentReport) =>
                          currentReport.id !==
                          report.id
                      )
                  );

                  Alert.alert(
                    'Report dismissed',
                    'The report has been dismissed.'
                  );
                } catch (error) {
                  console.error(
                    'Failed to dismiss moderation report:',
                    error
                  );

                  Alert.alert(
                    'Unable to dismiss report',
                    'Please try again.'
                  );
                } finally {
                  setDismissingReportId(
                    null
                  );
                }
              })();
            },
          },
        ]
      );
    },
    [
      dismissingReportId,
      removingContentReportId,
    ]
  );

  const handleRemoveContent = useCallback(
    (report: ModerationReport) => {
      if (
        dismissingReportId ||
        removingContentReportId ||
        report.targetType === 'user'
      ) {
        return;
      }

      const targetLabel =
        report.targetType === 'comment'
          ? 'comment'
          : 'list';

      Alert.alert(
        'Remove content?',
        `This will remove the reported ${targetLabel} from Top 3 and resolve the report. The content will be retained for moderation records.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove Content',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setRemovingContentReportId(
                  report.id
                );

                try {
                  await removeReportedContent(
                    report.id
                  );

                  await loadReports();

                  Alert.alert(
                    'Content removed',
                    `The reported ${targetLabel} has been removed and the report has been resolved.`
                  );
                } catch (error) {
                  console.error(
                    'Failed to remove reported content:',
                    error
                  );

                  Alert.alert(
                    'Unable to remove content',
                    'Please try again.'
                  );
                } finally {
                  setRemovingContentReportId(
                    null
                  );
                }
              })();
            },
          },
        ]
      );
    },
    [
      dismissingReportId,
      removingContentReportId,
      loadReports,
    ]
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Moderation"
        subtitle="Review pending reports."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadReports({
                refreshing: true,
              });
            }}
          />
        }>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending reports
          </Text>

          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator
                size="small"
                color={COLORS.text}
              />

              <Text style={styles.stateText}>
                Loading reports…
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                Unable to load reports
              </Text>

              <Text style={styles.stateText}>
                {loadError}
              </Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                No pending reports
              </Text>

              <Text style={styles.stateText}>
                New reports will appear here for review.
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isDismissing={
                  dismissingReportId ===
                  report.id
                }
                isRemovingContent={
                  removingContentReportId ===
                  report.id
                }
                onDismiss={
                  handleDismissReport
                }
                onRemoveContent={
                  handleRemoveContent
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },

  section: {
    marginTop: SPACING.sm,
  },

  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: SPACING.md,
    fontSize: 18,
  },

  reportCard: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
  },

  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },

  reportHeaderText: {
    flex: 1,
    minWidth: 0,
    marginRight: SPACING.md,
  },

  reportTargetType: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
  },

  reportDate: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  pendingBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },

  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondaryText,
  },

  reportSection: {
    paddingVertical: SPACING.sm,
  },

  reportLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.tertiaryText,
    textTransform: 'uppercase',
  },

  reportPrimaryText: {
    ...TYPOGRAPHY.headline,
    marginTop: 4,
    color: COLORS.text,
  },

  reportSecondaryText: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
  },

  reportContentText: {
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },

  reportDetails: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.secondaryText,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },

  actionSection: {
    paddingTop: SPACING.md,
  },

  removeContentButton: {
    minHeight: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },

  removeContentButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF3B30',
  },

  removeContentButtonPressed: {
    opacity: 0.72,
  },

  dismissButton: {
    minHeight: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },

  dismissButtonWithSpacing: {
    marginTop: SPACING.sm,
  },

  dismissButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  dismissButtonPressed: {
    opacity: 0.72,
  },

  actionButtonDisabled: {
    opacity: 0.6,
  },

  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },

  stateCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
  },

  stateTitle: {
    ...TYPOGRAPHY.headline,
    color: COLORS.text,
    textAlign: 'center',
  },

  stateText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },
});