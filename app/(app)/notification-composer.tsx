import AppText from '@/components/app-text';
import ActionSheet from '@/components/action-sheet';
import NotificationDestinationPicker from '@/components/notification-destination-picker';
import NotificationHistory from '@/components/notification-history';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import SegmentedControl from '@/components/segmented-control';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { RADIUS } from '@/constants/radius';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useFeedback } from '@/context/feedback-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { getExistingPushToken } from '@/lib/notifications';
import { isPushTokenRegistered } from '@/lib/supabase/push-tokens';
import { sendCampaignTestNotification } from '@/lib/supabase/campaign-notifications';
import {
  editScheduledNotificationCampaign,
  saveNotificationCampaignDraft,
  scheduleNotificationCampaign,
  type NotificationCampaign,
} from '@/lib/supabase/notification-campaigns';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  NotificationDestination,
  resolveDestinationOption,
} from '@/types/notification-destination';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildNotificationCopy } from '@/utils/build-notification-copy';
import { combineTorontoScheduleTime } from '@/utils/notification-schedule-time';
import {
  AppState,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 220;

function getCategoryName(categoryId: string): string {
  return (
    TOP3_CATEGORIES.find(
      (category) => category.id === categoryId
    )?.name ?? categoryId
  );
}

function formatScheduleSelection(
  date: Date,
  mode: 'date' | 'time'
): string {
  return new Intl.DateTimeFormat(
    'en-CA',
    mode === 'date'
      ? {
          timeZone: 'America/Toronto',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      : {
          timeZone: 'America/Toronto',
          hour: 'numeric',
          minute: '2-digit',
        }
  ).format(date) + (mode === 'time' ? ' ET' : '');
}

export default function NotificationComposerScreen() {
  const colors = useAppColors();
  const { showFeedback } = useFeedback();
  const { profile } = useProfile();
  const { options } = useCollectionOptions();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] =
    useState(false);
  const [isMessageManuallyEdited, setIsMessageManuallyEdited] =
    useState(false);
  const [selectedDestination, setSelectedDestination] =
    useState<NotificationDestination | null>(null);
  const [isPickingDestination, setIsPickingDestination] =
    useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const schedulingRef = useRef(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [editingScheduledId, setEditingScheduledId] =
    useState<string | null>(null);
  const [editingScheduledOriginal, setEditingScheduledOriginal] =
    useState<NotificationCampaign | null>(null);
  const [isSavingScheduled, setIsSavingScheduled] =
    useState(false);
  const savingScheduledRef = useRef(false);
  const [scheduledDate, setScheduledDate] = useState(
    () => new Date(Date.now() + 3600000)
  );
  const [scheduledTime, setScheduledTime] = useState(
    () => new Date(Date.now() + 3600000)
  );
  const [openSchedulePicker, setOpenSchedulePicker] =
    useState<'date' | 'time' | null>(null);
  const [activeView, setActiveView] = useState<
    'compose' | 'manage' | 'history'
  >('compose');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<'new' | 'discard' | 'historyUnconfirmed' | null>(null);

  const [scheduleValidationNow, setScheduleValidationNow] =
    useState(() => Date.now());

  useEffect(() => {
    const refreshScheduleValidation = () => {
      setScheduleValidationNow(Date.now());
    };

    const interval = setInterval(
      refreshScheduleValidation,
      30000
    );

    const subscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          refreshScheduleValidation();
        }
      }
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const originalScheduledTime = editingScheduledOriginal?.scheduledAt
    ? new Date(editingScheduledOriginal.scheduledAt)
    : null;

  const hasScheduledChanges =
    editingScheduledId !== null &&
    editingScheduledOriginal !== null &&
    originalScheduledTime !== null &&
    (
      title.trim() !== (editingScheduledOriginal.title ?? '').trim() ||
      message.trim() !== (editingScheduledOriginal.message ?? '').trim() ||
      selectedDestination?.categoryId !== editingScheduledOriginal.categoryId ||
      selectedDestination?.kind !== editingScheduledOriginal.destinationKind ||
      (
        selectedDestination && selectedDestination.kind !== 'overall'
          ? selectedDestination.optionId
          : null
      ) !== (editingScheduledOriginal.optionId ?? null) ||
      formatScheduleSelection(scheduledDate, 'date') !==
        formatScheduleSelection(originalScheduledTime, 'date') ||
      formatScheduleSelection(scheduledTime, 'time') !==
        formatScheduleSelection(originalScheduledTime, 'time')
    );

  const selectedOption = selectedDestination
    ? resolveDestinationOption(selectedDestination, options)
    : null;

  const scheduleTimeError = useMemo(() => {
    try {
      combineTorontoScheduleTime(
        scheduledDate,
        scheduledTime
      );
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'Choose a valid future date and time.';
    }
  }, [
    scheduledDate,
    scheduledTime,
    scheduleValidationNow,
  ]);

  const hasValidScheduleContent =
    title.trim().length > 0 &&
    title.trim().length <= MAX_TITLE_LENGTH &&
    message.trim().length > 0 &&
    message.trim().length <= MAX_MESSAGE_LENGTH &&
    selectedDestination !== null &&
    (
      selectedDestination.kind === 'overall' ||
      selectedOption !== null
    );

  const isScheduleTestReady =
    profile.isAdmin &&
    hasValidScheduleContent &&
    scheduleTimeError === null;

  const destinationLabel = !selectedDestination
    ? 'Choose a Top 3'
    : selectedDestination.kind === 'overall'
      ? `${getCategoryName(selectedDestination.categoryId)} · Overall`
      : selectedOption
        ? `${getCategoryName(selectedDestination.categoryId)} · ${
            selectedDestination.kind === 'type'
              ? 'Types'
              : 'Themes'
          } · ${selectedOption.name}`
        : 'Destination unavailable';

  const suggestedCopy = selectedDestination
    ? buildNotificationCopy(selectedDestination, options)
    : null;

  function handleSelectDestination(
    destination: NotificationDestination
  ) {
    const suggestion = buildNotificationCopy(
      destination,
      options
    );

    if (suggestion) {
      if (!isTitleManuallyEdited) {
        setTitle(suggestion.title);
      }

      if (!isMessageManuallyEdited) {
        setMessage(suggestion.message);
      }
    }

    setSelectedDestination(destination);
    setIsPickingDestination(false);
  }

  function resetSuggestedCopy() {
    if (!suggestedCopy) {
      return;
    }

    setTitle(suggestedCopy.title);
    setMessage(suggestedCopy.message);
    setIsTitleManuallyEdited(false);
    setIsMessageManuallyEdited(false);
  }

  function restoreCampaignContent(
    campaign: NotificationCampaign
  ) {
    const category = TOP3_CATEGORIES.find(
      (item) => item.id === campaign.categoryId
    );

    let restoredDestination: NotificationDestination | null =
      null;

    if (category && campaign.destinationKind === 'overall') {
      restoredDestination = {
        categoryId: category.id,
        kind: 'overall',
      };
    } else if (
      category &&
      (campaign.destinationKind === 'type' ||
        campaign.destinationKind === 'theme') &&
      campaign.optionId
    ) {
      restoredDestination = {
        categoryId: category.id,
        kind: campaign.destinationKind,
        optionId: campaign.optionId,
      };
    }

    setTitle(campaign.title ?? '');
    setMessage(campaign.message ?? '');
    setSelectedDestination(restoredDestination);
    setIsTitleManuallyEdited(true);
    setIsMessageManuallyEdited(true);
    setIsPickingDestination(false);
    setOpenSchedulePicker(null);
    Keyboard.dismiss();
    setActiveView('compose');
  }

  function handleEditDraft(campaign: NotificationCampaign) {
    if (
      campaign.status !== 'draft' ||
      isSavingDraft ||
      isSendingTest ||
      isScheduling ||
      isSavingScheduled
    ) {
      return;
    }

    setEditingScheduledId(null);
    setEditingScheduledOriginal(null);
    setDraftId(campaign.id);
    restoreCampaignContent(campaign);
  }

  function handleEditScheduled(campaign: NotificationCampaign) {
    if (
      campaign.status !== 'scheduled' ||
      campaign.audience !== 'test' ||
      !campaign.scheduledAt ||
      isSavingDraft ||
      isSendingTest ||
      isScheduling ||
      isSavingScheduled
    ) {
      return;
    }

    const originalSchedule = new Date(campaign.scheduledAt);

    if (!Number.isFinite(originalSchedule.getTime())) {
      showFeedback({
        kind: 'warning',
        title: 'Invalid Scheduled Time',
        message: 'This notification has an invalid scheduled date.',
      });
      return;
    }

    setDraftId(null);
    setEditingScheduledId(campaign.id);
    setEditingScheduledOriginal(campaign);
    setScheduledDate(originalSchedule);
    setScheduledTime(originalSchedule);
    restoreCampaignContent(campaign);
  }

  function handleNewNotification() {
    if (
      isSavingDraft ||
      isSendingTest ||
      isScheduling ||
      isSavingScheduled
    ) {
      return;
    }

    setPendingConfirmation('new');
  }

  function startNewNotification() {
    setDraftId(null);
    setEditingScheduledId(null);
    setEditingScheduledOriginal(null);
    setOpenSchedulePicker(null);
    const defaultTime = new Date(Date.now() + 3600000);
    setScheduledDate(defaultTime);
    setScheduledTime(defaultTime);
    setTitle('');
    setMessage('');
    setSelectedDestination(null);
    setIsTitleManuallyEdited(false);
    setIsMessageManuallyEdited(false);
    setIsPickingDestination(false);
    Keyboard.dismiss();
    setActiveView('compose');
  }

  function openAndroidSchedulePicker(
    mode: 'date' | 'time'
  ) {
    if (Platform.OS !== 'android') {
      return;
    }

    DateTimePickerAndroid.open({
      value: mode === 'date' ? scheduledDate : scheduledTime,
      mode,
      timeZoneName: 'America/Toronto',
      ...(mode === 'date'
        ? { minimumDate: new Date() }
        : {}),
      onChange: (event, selected) => {
        if (event.type !== 'set' || !selected) {
          return;
        }

        if (mode === 'date') {
          setScheduledDate(selected);
        } else {
          setScheduledTime(selected);
        }
      },
    });
  }

  async function handleScheduleTest() {
    if (
      schedulingRef.current ||
      isScheduling ||
      isSavingDraft ||
      isSendingTest ||
      isSavingScheduled ||
      editingScheduledId !== null ||
      !profile.isAdmin
    ) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const destination = selectedDestination;

    if (!cleanTitle || !cleanMessage || !destination) {
      showFeedback({
        kind: 'warning',
        title: 'Incomplete Notification',
        message: 'Enter a title and message, then choose a destination Top 3.',
      });
      return;
    }

    if (
      destination.kind !== 'overall' &&
      !selectedOption
    ) {
      showFeedback({
        kind: 'warning',
        title: 'Destination Unavailable',
        message: 'This destination is no longer available. Please choose another Top 3.',
      });
      return;
    }

    let scheduledAt: string;

    try {
      scheduledAt = combineTorontoScheduleTime(
        scheduledDate,
        scheduledTime
      );
    } catch (error) {
      showFeedback({
        kind: 'warning',
        title: 'Invalid Scheduling Time',
        message: error instanceof Error
          ? error.message
          : 'Choose a valid future date and time.',
      });
      return;
    }

    schedulingRef.current = true;
    setIsScheduling(true);
    Keyboard.dismiss();

    try {
      const expoPushToken = await getExistingPushToken();

      if (!expoPushToken) {
        showFeedback({
          kind: 'warning',
          title: 'Notifications Are Off',
          message: 'Enable notifications for Top 3 before scheduling a test.',
        });
        return;
      }

      const registered =
        await isPushTokenRegistered(expoPushToken);

      if (!registered) {
        showFeedback({
          kind: 'warning',
          title: 'Device Not Registered',
          message: 'Turn on push notifications in Top 3 Settings to register this device.',
        });
        return;
      }

      let savedId = draftId;

      if (!savedId) {
        savedId = await saveNotificationCampaignDraft({
          title: cleanTitle,
          message: cleanMessage,
          destination,
        });

        setDraftId(savedId);
      }

      await scheduleNotificationCampaign({
        id: savedId,
        title: cleanTitle,
        message: cleanMessage,
        destination,
        scheduledAt,
        expoPushToken,
      });

      const scheduledDateTime = new Date(scheduledAt);

      const dateLabel = formatScheduleSelection(
        scheduledDateTime,
        'date'
      );

      const timeLabel = formatScheduleSelection(
        scheduledDateTime,
        'time'
      );

      setDraftId(null);
      setTitle('');
      setMessage('');
      setSelectedDestination(null);
      setIsTitleManuallyEdited(false);
      setIsMessageManuallyEdited(false);
      setIsPickingDestination(false);
      setActiveView('manage');

      showFeedback({
        kind: 'warning',
        title: 'Test Scheduled',
        message: `Scheduled for ${dateLabel} at ${timeLabel}. Automatic delivery is not enabled yet.`,
      });
    } catch (error) {
      showFeedback({
        kind: 'error',
        title: 'Unable to Schedule',
        message: error instanceof Error
          ? error.message
          : 'Please try again.',
      });
    } finally {
      schedulingRef.current = false;
      setIsScheduling(false);
    }
  }

  async function handleSaveDraft() {
    if (
      isSavingDraft ||
      isSendingTest ||
      isScheduling ||
      isSavingScheduled ||
      editingScheduledId !== null ||
      !profile.isAdmin
    ) {
      return;
    }

    Keyboard.dismiss();
    setIsSavingDraft(true);

    try {
      const savedId = await saveNotificationCampaignDraft({
        id: draftId,
        title,
        message,
        destination: selectedDestination,
      });

      setDraftId(savedId);

      showFeedback({
        kind: 'success',
        title: 'Draft Saved',
        message: 'Your notification draft has been saved.',
      });
    } catch (error) {
      showFeedback({
        kind: 'error',
        title: 'Unable to Save Draft',
        message: error instanceof Error
          ? error.message
          : 'Please try again.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  }

  function leaveScheduledEdit() {
    setEditingScheduledId(null);
    setEditingScheduledOriginal(null);
    setDraftId(null);
    setTitle('');
    setMessage('');
    setSelectedDestination(null);
    setIsTitleManuallyEdited(false);
    setIsMessageManuallyEdited(false);
    setIsPickingDestination(false);
    setOpenSchedulePicker(null);

    const defaultTime = new Date(
      Date.now() + 3600000
    );
    setScheduledDate(defaultTime);
    setScheduledTime(defaultTime);

    Keyboard.dismiss();
    setActiveView('manage');
  }

  function handleBackToManage() {
    if (savingScheduledRef.current || isSavingScheduled) {
      return;
    }

    if (!hasScheduledChanges) {
      leaveScheduledEdit();
      return;
    }

    setPendingConfirmation('discard');
  }

  async function handleSaveScheduled() {
    if (
      !editingScheduledId ||
      !hasScheduledChanges ||
      savingScheduledRef.current ||
      isSavingScheduled ||
      isSavingDraft ||
      isSendingTest ||
      isScheduling ||
      !profile.isAdmin
    ) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const destination = selectedDestination;

    if (
      !cleanTitle ||
      !cleanMessage ||
      !destination ||
      cleanTitle.length > MAX_TITLE_LENGTH ||
      cleanMessage.length > MAX_MESSAGE_LENGTH
    ) {
      showFeedback({
        kind: 'warning',
        title: 'Incomplete Notification',
        message: 'Enter a valid title and message, then choose a destination Top 3.',
      });
      return;
    }

    if (
      destination.kind !== 'overall' &&
      !selectedOption
    ) {
      showFeedback({
        kind: 'warning',
        title: 'Destination Unavailable',
        message: 'This destination is no longer available. Please choose another Top 3.',
      });
      return;
    }

    let scheduledAt: string;

    try {
      scheduledAt = combineTorontoScheduleTime(
        scheduledDate,
        scheduledTime
      );
    } catch (error) {
      showFeedback({
        kind: 'warning',
        title: 'Invalid Scheduling Time',
        message: error instanceof Error
          ? error.message
          : 'Choose a valid future date and time.',
      });
      return;
    }

    savingScheduledRef.current = true;
    setIsSavingScheduled(true);
    Keyboard.dismiss();

    try {
      await editScheduledNotificationCampaign({
        id: editingScheduledId,
        title: cleanTitle,
        message: cleanMessage,
        destination,
        scheduledAt,
      });

      setEditingScheduledId(null);
      setEditingScheduledOriginal(null);
      setDraftId(null);
      setTitle('');
      setMessage('');
      setSelectedDestination(null);
      setIsTitleManuallyEdited(false);
      setIsMessageManuallyEdited(false);
      setIsPickingDestination(false);
      setOpenSchedulePicker(null);
      setActiveView('manage');

      showFeedback({
        kind: 'success',
        title: 'Changes Saved',
        message: 'Your scheduled test has been updated. The target device is unchanged.',
      });
    } catch (error) {
      showFeedback({
        kind: 'error',
        title: 'Unable to Save Changes',
        message: error instanceof Error
          ? error.message
          : 'Please try again.',
      });
    } finally {
      savingScheduledRef.current = false;
      setIsSavingScheduled(false);
    }
  }

  async function handleSendTest() {
    if (
      isSendingTest ||
      isSavingDraft ||
      isScheduling ||
      isSavingScheduled ||
      editingScheduledId !== null ||
      !profile.isAdmin
    ) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage || !selectedDestination) {
      showFeedback({
        kind: 'warning',
        title: 'Incomplete Notification',
        message: 'Enter a title and message, then choose a destination Top 3.',
      });
      return;
    }

    if (
      selectedDestination.kind !== 'overall' &&
      !selectedOption
    ) {
      showFeedback({
        kind: 'warning',
        title: 'Destination Unavailable',
        message: 'This destination is no longer available. Please choose another Top 3.',
      });
      return;
    }

    setIsSendingTest(true);

    try {
      const expoPushToken = await getExistingPushToken();

      if (!expoPushToken) {
        showFeedback({
          kind: 'warning',
          title: 'Notifications Are Off',
          message: 'Enable notifications for Top 3 in your iPhone Settings and in the app before sending a test.',
        });
        return;
      }

      const registered =
        await isPushTokenRegistered(expoPushToken);

      if (!registered) {
        showFeedback({
          kind: 'warning',
          title: 'Device Not Registered',
          message: 'Turn on push notifications in Top 3 Settings to register this device, then try again.',
        });
        return;
      }

      const result = await sendCampaignTestNotification({
        title: cleanTitle,
        message: cleanMessage,
        destination: selectedDestination,
        expoPushToken,
      });

      if (!result.historyRecorded) {
        setPendingConfirmation('historyUnconfirmed');
      } else {
        showFeedback({
          kind: 'warning',
          title: 'Test Accepted',
          message: 'Expo accepted the test notification and its history was saved. Check your iPhone to confirm delivery.',
        });
      }
    } catch (error) {
      showFeedback({
        kind: 'error',
        title: 'Unable to Send Test',
        message: error instanceof Error
          ? error.message
          : 'Please try again.',
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  if (!profile.isAdmin) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}>
        <ScreenHeader showBackButton />
        <PageHeader
          title="Notifications"
          subtitle="Administrator access required."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}>
      <ScreenHeader showBackButton />

      <View style={styles.viewSwitcher}>
        <SegmentedControl<'compose' | 'manage' | 'history'>
          value={activeView}
          options={[
            {
              value: 'compose',
              label: 'Compose',
              accessibilityLabel: 'Compose notification',
            },
            {
              value: 'manage',
              label: 'Manage',
              accessibilityLabel: 'Manage notification drafts',
            },
            {
              value: 'history',
              label: 'History',
              accessibilityLabel: 'View notification history',
            },
          ]}
          onChange={(view) => {
            Keyboard.dismiss();
            setActiveView(view);
          }}
        />
      </View>

      {activeView === 'history' ? (
        <NotificationHistory mode="history" />
      ) : activeView === 'manage' ? (
        <NotificationHistory
          mode="manage"
          onEditDraft={handleEditDraft}
          onEditScheduled={handleEditScheduled}
        />
      ) : (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {draftId || title || message || selectedDestination ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new notification"
            disabled={
              isSavingDraft ||
              isSendingTest ||
              isScheduling ||
              isSavingScheduled
            }
            onPress={handleNewNotification}
            style={styles.newNotificationButton}>
            <Ionicons
              name="add"
              size={18}
              color={colors.primary}
            />
            <AppText
              variant="label"
              style={{ color: colors.primary }}>
              New Notification
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.field}>
          <AppText variant="formLabel">
            Destination Top 3
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose destination Top 3"
            onPress={() => {
              Keyboard.dismiss();
              setIsPickingDestination(true);
            }}
            style={[
              styles.destinationSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <AppText
              variant="body"
              style={styles.destinationSelectedText}>
              {destinationLabel}
            </AppText>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondaryText}
            />
          </Pressable>

        </View>

        <View style={styles.field}>
          <AppText variant="formLabel">
            Notification title
          </AppText>
          <TextInput
            accessibilityLabel="Notification title"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setIsTitleManuallyEdited(true);
            }}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="Enter notification title"
            placeholderTextColor={colors.tertiaryText}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <AppText variant="label" tone="tertiary">
            {title.length}/{MAX_TITLE_LENGTH}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="formLabel">
            Message
          </AppText>
          <TextInput
            accessibilityLabel="Notification message"
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setIsMessageManuallyEdited(true);
            }}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            textAlignVertical="top"
            placeholder="Write a short message…"
            placeholderTextColor={colors.tertiaryText}
            style={[
              styles.input,
              styles.messageInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <AppText variant="label" tone="tertiary">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </AppText>
        </View>

        {suggestedCopy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset to suggested notification copy"
            onPress={resetSuggestedCopy}
            style={styles.resetCopyButton}>
            <Ionicons
              name="refresh"
              size={17}
              color={colors.primary}
            />
            <AppText
              variant="label"
              style={{ color: colors.primary }}>
              Reset to Suggested Copy
            </AppText>
          </Pressable>
        ) : null}

        <View style={styles.field}>
          <AppText variant="sectionTitle">
            Preview
          </AppText>
          <View
            style={[
              styles.preview,
              { backgroundColor: colors.secondarySurface },
            ]}>
            <AppText variant="label" tone="tertiary">
              Top 3 · Now
            </AppText>
            <AppText variant="headline">
              {title.trim() || 'Notification title'}
            </AppText>
            <AppText variant="body">
              {message.trim() || 'Your message will appear here.'}
            </AppText>
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="sectionTitle">
            Schedule
          </AppText>

          <View style={styles.scheduleRow}>
            <View
              style={[
                styles.scheduleField,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <AppText variant="formLabel">Date</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose scheduling date"
                disabled={isScheduling || isSavingScheduled}
                onPress={() => {
                  Keyboard.dismiss();
                  if (Platform.OS === 'android') {
                    openAndroidSchedulePicker('date');
                  } else {
                    setOpenSchedulePicker(
                      openSchedulePicker === 'date' ? null : 'date'
                    );
                  }
                }}
                style={styles.scheduleValueRow}>
                <AppText
                  variant="body"
                  style={styles.scheduleValueText}>
                  {formatScheduleSelection(scheduledDate, 'date')}
                </AppText>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.scheduleField,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <AppText variant="formLabel">Time</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose scheduling time"
                disabled={isScheduling || isSavingScheduled}
                onPress={() => {
                  Keyboard.dismiss();
                  if (Platform.OS === 'android') {
                    openAndroidSchedulePicker('time');
                  } else {
                    setOpenSchedulePicker(
                      openSchedulePicker === 'time' ? null : 'time'
                    );
                  }
                }}
                style={styles.scheduleValueRow}>
                <AppText
                  variant="body"
                  style={styles.scheduleValueText}>
                  {formatScheduleSelection(scheduledTime, 'time')}
                </AppText>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'ios' && openSchedulePicker ? (
            <View
              style={[
                styles.schedulePickerPanel,
                { backgroundColor: colors.surface },
              ]}>
              <DateTimePicker
                value={
                  openSchedulePicker === 'date'
                    ? scheduledDate
                    : scheduledTime
                }
                mode={openSchedulePicker}
                display="spinner"
                timeZoneName="America/Toronto"
                textColor={colors.text}
                minimumDate={
                  openSchedulePicker === 'date'
                    ? new Date()
                    : undefined
                }
                style={styles.scheduleSpinner}
                onChange={(_, selected) => {
                  if (!selected) {
                    return;
                  }
                  if (openSchedulePicker === 'date') {
                    setScheduledDate(selected);
                  } else {
                    setScheduledTime(selected);
                  }
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done selecting schedule"
                style={styles.scheduleDone}
                onPress={() => setOpenSchedulePicker(null)}>
                <AppText variant="action">Done</AppText>
              </Pressable>
            </View>
          ) : null}

          <AppText variant="label" tone="tertiary">
            All scheduling times are in Toronto time (ET).
          </AppText>

          {scheduleTimeError ? (
            <AppText
              variant="label"
              tone="destructive">
              {scheduleTimeError}
            </AppText>
          ) : null}
        </View>

        <View style={styles.actions}>
          {editingScheduledId ? (
            <>
              <PrimaryButton
                title={
                  isSavingScheduled
                    ? 'Saving Changes…'
                    : 'Save Changes'
                }
                disabled={
                  !hasScheduledChanges ||
                  isSavingScheduled ||
                  isSavingDraft ||
                  isSendingTest ||
                  isScheduling
                }
                onPress={() => {
                  void handleSaveScheduled();
                }}
              />

              <AuthProviderButton
                title="Back to Manage"
                variant="secondary"
                disabled={isSavingScheduled}
                onPress={handleBackToManage}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                title={isScheduling ? 'Scheduling…' : 'Schedule Test'}
                keepAppearanceWhenDisabled={
                  isScheduleTestReady &&
                  !isScheduling &&
                  (isSavingDraft || isSendingTest)
                }
                disabled={
                  !isScheduleTestReady ||
                  isScheduling ||
                  isSavingDraft ||
                  isSendingTest
                }
            onPress={() => {
              void handleScheduleTest();
            }}
          />

          <View style={styles.secondaryActionsRow}>
            <View style={styles.secondaryActionSlot}>
              <AuthProviderButton
                title={
                  isSavingDraft
                    ? 'Saving Draft…'
                    : draftId
                      ? 'Save Changes'
                      : 'Save Draft'
                }
                variant="secondary"
                style={styles.secondaryActionButton}
                disabled={isSavingDraft || isSendingTest || isScheduling}
                onPress={() => {
                  void handleSaveDraft();
                }}
              />
            </View>
            <View style={styles.secondaryActionSlot}>
              <AuthProviderButton
                title={isSendingTest ? 'Sending Test…' : 'Send Test'}
                variant="secondary"
                style={styles.secondaryActionButton}
                disabled={isSendingTest || isSavingDraft || isScheduling}
                onPress={() => {
                  void handleSendTest();
                }}
              />
            </View>
          </View>
          <PrimaryButton
            title="Send to All"
            disabled
            onPress={() => {}}
          />
          <AppText
            variant="label"
            tone="tertiary"
            style={styles.note}>
            Test notifications go only to this device.
            Sending to all users is not available yet.
          </AppText>
            </>
          )}
        </View>
      </ScrollView>
      )}

      <NotificationDestinationPicker
        visible={isPickingDestination}
        selected={selectedDestination}
        onSelect={handleSelectDestination}
        onClose={() => setIsPickingDestination(false)}
      />
      <ActionSheet
        visible={pendingConfirmation !== null}
        title={
          pendingConfirmation === 'new'
            ? 'New Notification'
            : pendingConfirmation === 'historyUnconfirmed'
              ? 'Test Accepted — History Not Confirmed'
              : 'Discard Changes?'
        }
        message={
          pendingConfirmation === 'new'
            ? 'Start a new notification? Unsaved changes in this form will be lost. Your previously saved drafts will remain in Manage.'
            : pendingConfirmation === 'historyUnconfirmed'
              ? 'Expo accepted the notification, but its history could not be confirmed. Check your iPhone before considering another send.'
              : 'You have unsaved changes to this notification.'
        }
        actions={
          pendingConfirmation === 'new'
            ? [
                {
                  label: 'Start New',
                  onPress: () => {
                    setPendingConfirmation(null);
                    startNewNotification();
                  },
                },
                {
                  label: 'Cancel',
                  variant: 'cancel',
                  onPress: () => setPendingConfirmation(null),
                },
              ]
            : pendingConfirmation === 'historyUnconfirmed'
              ? [
                  {
                    label: 'Understood',
                    onPress: () => setPendingConfirmation(null),
                  },
                ]
              : [
                {
                  label: 'Discard Changes',
                  variant: 'destructive',
                  onPress: () => {
                    setPendingConfirmation(null);
                    leaveScheduledEdit();
                  },
                },
                {
                  label: 'Keep Editing',
                  variant: 'cancel',
                  onPress: () => setPendingConfirmation(null),
                },
              ]
        }
        onClose={() => {
          if (pendingConfirmation !== 'historyUnconfirmed') {
            setPendingConfirmation(null);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewSwitcher: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  field: {
    marginTop: 24,
    gap: 10,
  },
  newNotificationButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  resetCopyButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 105,
  },
  destinationSelector: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationSelectedText: {
    flex: 1,
    marginRight: 12,
  },
  preview: {
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleValueRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  scheduleValueText: {
    flexShrink: 1,
  },
  schedulePickerPanel: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginTop: 12,
  },
  scheduleSpinner: {
    width: '100%',
    height: 216,
  },
  scheduleDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleField: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 8,
    justifyContent: 'space-between',
  },
  actions: {
    marginTop: 30,
    gap: 12,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionSlot: {
    flex: 1,
    minWidth: 0,
  },
  secondaryActionButton: {
    paddingHorizontal: 8,
  },
  note: {
    textAlign: 'center',
    marginTop: 4,
  },
});
