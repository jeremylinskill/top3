import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import PageHeader from '@/components/page-header';
import ScreenHeader from '@/components/screen-header';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { useAppColors } from '@/hooks/use-app-colors';
import {
  dismissReport,
  getPendingReports,
  ModerationReport,
  removeReportedContent,
} from '@/lib/supabase/moderation';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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

type ModerationActionSheet =
  | {
      type: 'dismiss-confirmation';
      report: ModerationReport;
    }
  | {
      type: 'dismiss-success';
    }
  | {
      type: 'dismiss-error';
    }
  | {
      type: 'remove-confirmation';
      report: ModerationReport;
      targetLabel: 'comment' | 'list';
    }
  | {
      type: 'remove-success';
      targetLabel: 'comment' | 'list';
    }
  | {
      type: 'remove-error';
    }
  | null;

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
  const colors = useAppColors();
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
    <View
      style={[
        styles.reportCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <View style={styles.reportHeader}>
        <View style={styles.reportHeaderText}>
          <AppText variant="headline">
            {formatTargetType(
              report.targetType
            )}
          </AppText>

          <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.reportDate}>
            {formatReportDate(
              report.createdAt
            )}
          </AppText>
        </View>

        <View
          style={[
            styles.pendingBadge,
            {
              backgroundColor: colors.background,
            },
          ]}>
          <AppText
            variant="micro"
            tone="secondary"
            emphasis="strong">
            Pending
          </AppText>
        </View>
      </View>

      <View style={styles.reportSection}>
        <AppText
          variant="micro"
          tone="tertiary"
          emphasis="strong"
          style={styles.reportLabel}>
          Reported user
        </AppText>

        <AppText
          variant="headline"
          style={styles.reportPrimaryText}>
          {reportedUserName}
        </AppText>

        {reportedUsername ? (
          <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.reportSecondaryText}>
            {reportedUsername}
          </AppText>
        ) : null}
      </View>

      {reportedContentLabel ? (
        <>
          <View
        style={[
          styles.divider,
          {
            backgroundColor: colors.border,
          },
        ]}
      />

          <View style={styles.reportSection}>
            <AppText
          variant="micro"
          tone="tertiary"
          emphasis="strong"
          style={styles.reportLabel}>
              {reportedContentLabel}
            </AppText>

            {report.reportedContent?.type ===
            'comment' ? (
              <AppText
                variant="body"
                style={styles.reportContentText}>
                {report.reportedContent.content}
              </AppText>
            ) : report.reportedContent?.type ===
              'post' ? (
              <>
                <AppText
          variant="headline"
          style={styles.reportPrimaryText}>
                  {report.reportedContent.title}
                </AppText>

                <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.reportSecondaryText}>
                  {[
                    report.reportedContent
                      .category,
                    report.reportedContent.topic,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      <View
        style={[
          styles.divider,
          {
            backgroundColor: colors.border,
          },
        ]}
      />

      <View style={styles.reportSection}>
        <AppText
          variant="micro"
          tone="tertiary"
          emphasis="strong"
          style={styles.reportLabel}>
          Reported by
        </AppText>

        <AppText
          variant="headline"
          style={styles.reportPrimaryText}>
          {reporterName}
        </AppText>

        {reporterUsername ? (
          <AppText
            variant="label"
            tone="tertiary"
            emphasis="regular"
            style={styles.reportSecondaryText}>
            {reporterUsername}
          </AppText>
        ) : null}
      </View>

      <View
        style={[
          styles.divider,
          {
            backgroundColor: colors.border,
          },
        ]}
      />

      <View style={styles.reportSection}>
        <AppText
          variant="micro"
          tone="tertiary"
          emphasis="strong"
          style={styles.reportLabel}>
          Reason
        </AppText>

        <AppText
          variant="headline"
          style={styles.reportPrimaryText}>
          {formatReason(report.reason)}
        </AppText>

        {report.details ? (
          <AppText
            variant="label"
            tone="secondary"
            emphasis="regular"
            style={styles.reportDetails}>
            {report.details}
          </AppText>
        ) : null}
      </View>

      <View
        style={[
          styles.divider,
          {
            backgroundColor: colors.border,
          },
        ]}
      />

      <View style={styles.actionSection}>
        {report.targetType !== 'user' ? (
          <Pressable
            style={({ pressed }) => [
              styles.removeContentButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.destructive,
              },
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
                color={colors.destructive}
              />
            ) : (
              <AppText
                variant="action"
                tone="destructive"
                emphasis="strong">
                Remove Content
              </AppText>
            )}
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.dismissButton,
            {
              backgroundColor: colors.background,
            },
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
              color={colors.text}
            />
          ) : (
            <AppText
              variant="action"
              tone="primary"
              emphasis="strong">
              Dismiss Report
            </AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function ModerationScreen() {
  const colors = useAppColors();
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

  const [
    moderationActionSheet,
    setModerationActionSheet,
  ] = useState<ModerationActionSheet>(null);

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

  const performDismissReport = useCallback(
    async (report: ModerationReport) => {
      setDismissingReportId(report.id);

      try {
        await dismissReport(report.id);

        setReports((currentReports) =>
          currentReports.filter(
            (currentReport) =>
              currentReport.id !== report.id
          )
        );

        setModerationActionSheet({
          type: 'dismiss-success',
        });
      } catch (error) {
        console.error(
          'Failed to dismiss moderation report:',
          error
        );

        setModerationActionSheet({
          type: 'dismiss-error',
        });
      } finally {
        setDismissingReportId(null);
      }
    },
    []
  );

  const handleDismissReport = useCallback(
    (report: ModerationReport) => {
      if (
        dismissingReportId ||
        removingContentReportId
      ) {
        return;
      }

      setModerationActionSheet({
        type: 'dismiss-confirmation',
        report,
      });
    },
    [
      dismissingReportId,
      removingContentReportId,
    ]
  );

  const performRemoveContent = useCallback(
    async (
      report: ModerationReport,
      targetLabel: 'comment' | 'list'
    ) => {
      setRemovingContentReportId(report.id);

      try {
        await removeReportedContent(report.id);

        await loadReports();

        setModerationActionSheet({
          type: 'remove-success',
          targetLabel,
        });
      } catch (error) {
        console.error(
          'Failed to remove reported content:',
          error
        );

        setModerationActionSheet({
          type: 'remove-error',
        });
      } finally {
        setRemovingContentReportId(null);
      }
    },
    [loadReports]
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

      setModerationActionSheet({
        type: 'remove-confirmation',
        report,
        targetLabel,
      });
    },
    [
      dismissingReportId,
      removingContentReportId,
    ]
  );

  function closeModerationActionSheet() {
    setModerationActionSheet(null);
  }

  let moderationSheetTitle = '';
  let moderationSheetMessage = '';
  let moderationSheetActions: {
    label: string;
    variant?: 'default' | 'destructive' | 'cancel';
    onPress: () => void;
  }[] = [];

  if (moderationActionSheet) {
    switch (moderationActionSheet.type) {
      case 'dismiss-confirmation': {
        const { report } = moderationActionSheet;

        moderationSheetTitle = 'Dismiss report?';
        moderationSheetMessage =
          'This will mark the report as dismissed. The reported user and content will not be changed.';
        moderationSheetActions = [
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationActionSheet,
          },
          {
            label: 'Dismiss Report',
            onPress: () => {
              closeModerationActionSheet();
              void performDismissReport(report);
            },
          },
        ];
        break;
      }

      case 'dismiss-success':
        moderationSheetTitle = 'Report dismissed';
        moderationSheetMessage =
          'The report has been dismissed.';
        moderationSheetActions = [
          {
            label: 'OK',
            onPress: closeModerationActionSheet,
          },
        ];
        break;

      case 'dismiss-error':
        moderationSheetTitle =
          'Unable to dismiss report';
        moderationSheetMessage = 'Please try again.';
        moderationSheetActions = [
          {
            label: 'OK',
            onPress: closeModerationActionSheet,
          },
        ];
        break;

      case 'remove-confirmation': {
        const { report, targetLabel } =
          moderationActionSheet;

        moderationSheetTitle = 'Remove content?';
        moderationSheetMessage =
          `This will remove the reported ${targetLabel} from Top 3 and resolve the report. The content will be retained for moderation records.`;
        moderationSheetActions = [
          {
            label: 'Cancel',
            variant: 'cancel',
            onPress: closeModerationActionSheet,
          },
          {
            label: 'Remove Content',
            variant: 'destructive',
            onPress: () => {
              closeModerationActionSheet();
              void performRemoveContent(
                report,
                targetLabel
              );
            },
          },
        ];
        break;
      }

      case 'remove-success':
        moderationSheetTitle = 'Content removed';
        moderationSheetMessage =
          `The reported ${moderationActionSheet.targetLabel} has been removed and the report has been resolved.`;
        moderationSheetActions = [
          {
            label: 'OK',
            onPress: closeModerationActionSheet,
          },
        ];
        break;

      case 'remove-error':
        moderationSheetTitle =
          'Unable to remove content';
        moderationSheetMessage = 'Please try again.';
        moderationSheetActions = [
          {
            label: 'OK',
            onPress: closeModerationActionSheet,
          },
        ];
        break;
    }
  }


  return (
    <>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
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
            tintColor={colors.secondaryText}
            colors={[colors.secondaryText]}
            onRefresh={() => {
              void loadReports({
                refreshing: true,
              });
            }}
          />
        }>
        <View style={styles.section}>
          <AppText
            variant="sectionTitle"
            style={styles.sectionTitle}>
            Pending reports
          </AppText>

          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator
                size="small"
                color={colors.text}
              />

              <AppText
                variant="label"
                tone="tertiary"
                emphasis="regular"
                style={styles.stateText}>
                Loading reports…
              </AppText>
            </View>
          ) : loadError ? (
            <View
              style={[
                styles.stateCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <AppText
                variant="headline"
                style={styles.stateTitle}>
                Unable to load reports
              </AppText>

              <AppText
                variant="label"
                tone="tertiary"
                emphasis="regular"
                style={styles.stateText}>
                {loadError}
              </AppText>
            </View>
          ) : reports.length === 0 ? (
            <View
              style={[
                styles.stateCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <AppText
                variant="headline"
                style={styles.stateTitle}>
                No pending reports
              </AppText>

              <AppText
                variant="label"
                tone="tertiary"
                emphasis="regular"
                style={styles.stateText}>
                New reports will appear here for review.
              </AppText>
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

      <ActionSheet
        visible={moderationActionSheet !== null}
        title={moderationSheetTitle}
        message={moderationSheetMessage}
        actions={moderationSheetActions}
        onClose={closeModerationActionSheet}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: SPACING.md,
  },

  reportCard: {
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
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


  reportDate: {
    marginTop: 3,
  },

  pendingBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.lg,
  },


  reportSection: {
    paddingVertical: SPACING.sm,
  },

  reportLabel: {
    lineHeight: 16,
    textTransform: 'uppercase',
  },

  reportPrimaryText: {
    marginTop: 4,
  },

  reportSecondaryText: {
    marginTop: 2,
  },

  reportContentText: {
    marginTop: SPACING.sm,
  },

  reportDetails: {
    marginTop: SPACING.sm,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
  },

  actionSection: {
    paddingTop: SPACING.md,
  },

  removeContentButton: {
    minHeight: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },


  removeContentButtonPressed: {
    opacity: 0.72,
  },

  dismissButton: {
    minHeight: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },

  dismissButtonWithSpacing: {
    marginTop: SPACING.sm,
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
    borderWidth: 1,
    borderRadius: RADIUS.xl,
  },

  stateTitle: {
    textAlign: 'center',
  },

  stateText: {
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});