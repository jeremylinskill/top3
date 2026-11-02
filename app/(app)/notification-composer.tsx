import AppText from '@/components/app-text';
import ActionSheet from '@/components/action-sheet';
import NotificationDestinationPicker from '@/components/notification-destination-picker';
import NotificationHistory from '@/components/notification-history';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader, { SCREEN_HEADER_HEIGHT } from '@/components/screen-header';
import SegmentedControl from '@/components/segmented-control';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { RADIUS } from '@/constants/radius';
import { TEXT_STYLES } from '@/constants/typography';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useFeedback } from '@/context/feedback-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useHomeStickyHeader } from '@/hooks/use-home-sticky-header';
import Reanimated from 'react-native-reanimated';
import { getExistingPushToken } from '@/lib/notifications';
import { isPushTokenRegistered } from '@/lib/supabase/push-tokens';
import {
  sendCampaignTestNotification,
  previewNotificationBroadcast,
  sendNotificationBroadcast,
  type BroadcastPreview,
} from '@/lib/supabase/campaign-notifications';
import {
  editScheduledNotificationCampaign,
  saveNotificationCampaignDraft,
  scheduleNotificationCampaign,
  scheduleAllNotificationCampaign,
  previewScheduledBroadcastAudience,
  type ScheduledAudiencePreview,
  type NotificationCampaign,
} from '@/lib/supabase/notification-campaigns';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  NotificationDestination,
  resolveDestinationOption,
  resolveDestinationGenre,
} from '@/types/notification-destination';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildNotificationCopy } from '@/utils/build-notification-copy';
import { combineTorontoScheduleTime } from '@/utils/notification-schedule-time';
import {
  AppState,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 220;

// Immediate all-user sending is experimental and is intentionally not enabled.
const ALLOW_IMMEDIATE_BROADCAST = false;

// The server enforces separate test and broadcast deployment flags.
// The client never authorizes delivery by itself.
const ALLOW_TEST_SCHEDULING =
  ['kkltzygebomopysklaqq', 'nxtowcheatxouypzqkzc'].some(
    (project) => process.env.EXPO_PUBLIC_SUPABASE_URL?.includes(project) === true
  );

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
  const insets = useSafeAreaInsets();
  const ignoreComposerScroll = useCallback((_y: number) => {}, []);
  const ignoreComposerScrolled = useCallback((_scrolled: boolean) => {}, []);
  const {
    scrollHandler: stickyScrollHandler,
    headerStyle: stickyHeaderStyle,
    resetHeader: resetComposerHeader,
  } = useHomeStickyHeader(ignoreComposerScroll, ignoreComposerScrolled);
  // The segmented switcher is part of each view's scroll content;
  // the shared floating header remains overlaid above it.
  const scrollContentTop = insets.top + SCREEN_HEADER_HEIGHT;
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
  const [isPreparingBroadcast, setIsPreparingBroadcast] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  // Once a broadcast is attempted, keep actions locked until a new
  // notification is started. A failed network response may be ambiguous.
  const [broadcastSubmitted, setBroadcastSubmitted] = useState(false);
  const [broadcastOutcome, setBroadcastOutcome] = useState<'queued' | 'review' | null>(null);
  const broadcastSendingRef = useRef(false);
  const [broadcastConfirmation, setBroadcastConfirmation] = useState<(
    BroadcastPreview & {
      title: string;
      message: string;
      destination: NotificationDestination;
    }
  ) | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const schedulingRef = useRef(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [scheduleAudience, setScheduleAudience] = useState<'test' | 'all'>('test');
  const [scheduleAllConfirmation, setScheduleAllConfirmation] = useState<(
    ScheduledAudiencePreview & { title: string; message: string;
      destination: NotificationDestination; scheduledAt: string }
  ) | null>(null);
  const [editingScheduledId, setEditingScheduledId] =
    useState<string | null>(null);
  const [editingScheduledOriginal, setEditingScheduledOriginal] =
    useState<NotificationCampaign | null>(null);
  const [isSavingScheduled, setIsSavingScheduled] =
    useState(false);
  const savingScheduledRef = useRef(false);
  const [scheduledDate, setScheduledDate] = useState(
    () => new Date(Date.now() + 5 * 60 * 1000)
  );
  const [scheduledTime, setScheduledTime] = useState(
    () => new Date(Date.now() + 5 * 60 * 1000)
  );
  const [openSchedulePicker, setOpenSchedulePicker] =
    useState<'date' | 'time' | null>(null);
  const [activeView, setActiveView] = useState<
    'compose' | 'manage' | 'history'
  >('compose');
  const [pendingConfirmation, setPendingConfirmation] =
    useState<'new' | 'discard' | 'historyUnconfirmed' | 'sendAll' | 'scheduleAll' | null>(null);

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
    ? selectedDestination.kind === 'genre'
      ? resolveDestinationGenre(selectedDestination)
      : resolveDestinationOption(selectedDestination, options)
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
    ALLOW_TEST_SCHEDULING &&
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
              : selectedDestination.kind === 'genre'
                ? 'Genres'
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
        campaign.destinationKind === 'theme' ||
        campaign.destinationKind === 'genre') &&
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
    setScheduleAudience(campaign.audience);
    setBroadcastSubmitted(false);
    setBroadcastOutcome(null);
    Keyboard.dismiss();
    setActiveView('compose');
  }

  function handleEditDraft(campaign: NotificationCampaign) {
    if (
      campaign.status !== 'draft' ||
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
    setBroadcastSubmitted(false);
    setBroadcastOutcome(null);
    setDraftId(null);
    setEditingScheduledId(null);
    setEditingScheduledOriginal(null);
    setScheduleAudience('test');
    setScheduleAllConfirmation(null);
    setOpenSchedulePicker(null);
    const defaultTime = new Date(Date.now() + 5 * 60 * 1000);
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

  async function handlePrepareScheduleAll() {
    if (scheduleAudience !== 'all' || editingScheduledId !== null ||
        !profile.isAdmin || broadcastSubmitted || isPreparingBroadcast ||
        isScheduling || isSavingDraft || isSendingTest || isSavingScheduled ||
        !hasValidScheduleContent || scheduleTimeError) return;
    let scheduledAt: string;
    try {
      scheduledAt = combineTorontoScheduleTime(scheduledDate, scheduledTime);
    } catch (error) {
      showFeedback({ kind: 'warning', title: 'Invalid Scheduling Time',
        message: error instanceof Error ? error.message : 'Choose a future time.' });
      return;
    }
    if (!selectedDestination) return;
    setIsPreparingBroadcast(true);
    try {
      const audience = await previewScheduledBroadcastAudience();
      if (audience.deviceCount < 1) {
        showFeedback({ kind: 'warning', title: 'No Registered Devices',
          message: 'There are no registered devices to receive this notification.' });
        return;
      }
      setScheduleAllConfirmation({ ...audience,
        title: title.trim(), message: message.trim(),
        destination: selectedDestination, scheduledAt });
      setPendingConfirmation('scheduleAll');
    } catch (error) {
      showFeedback({ kind: 'error', title: 'Unable to Preview Audience',
        message: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setIsPreparingBroadcast(false); }
  }

  async function handleConfirmScheduleAll() {
    if (!scheduleAllConfirmation || schedulingRef.current || isScheduling ||
        isSavingDraft || isSendingTest || isSavingScheduled || !profile.isAdmin) return;
    const confirmed = scheduleAllConfirmation;
    setScheduleAllConfirmation(null);
    setPendingConfirmation(null);
    schedulingRef.current = true;
    setIsScheduling(true);
    Keyboard.dismiss();
    try {
      let id = draftId;
      if (!id) {
        id = await saveNotificationCampaignDraft({
          title: confirmed.title, message: confirmed.message,
          destination: confirmed.destination });
        setDraftId(id);
      }
      await scheduleAllNotificationCampaign({ id,
        title: confirmed.title, message: confirmed.message,
        destination: confirmed.destination, scheduledAt: confirmed.scheduledAt,
        expectedDeviceCount: confirmed.deviceCount });
      setDraftId(null);
      setTitle('');
      setMessage('');
      setSelectedDestination(null);
      setIsTitleManuallyEdited(false);
      setIsMessageManuallyEdited(false);
      setScheduleAudience('test');
      setActiveView('manage');
      showFeedback({ kind: 'success', title: 'Broadcast Scheduled',
        message: `Scheduled for ${formatScheduleSelection(new Date(confirmed.scheduledAt), 'date')} at ${formatScheduleSelection(new Date(confirmed.scheduledAt), 'time')}. ${confirmed.deviceCount} devices were registered when scheduled; the actual audience is checked at send time.` });
    } catch (error) {
      showFeedback({ kind: 'error', title: 'Unable to Schedule Broadcast',
        message: error instanceof Error ? error.message : 'Please try again.' });
    } finally { schedulingRef.current = false; setIsScheduling(false); }
  }

  async function handleScheduleTest() {
    // Guard the action as well as the button: an unavailable worker must
    // never produce a scheduled campaign in a Production app.
    if (!ALLOW_TEST_SCHEDULING || scheduleAudience !== 'test') {
      showFeedback({
        kind: 'warning',
        title: 'Scheduling Unavailable',
        message: 'Scheduled test delivery has not been enabled for this environment.',
      });
      return;
    }

    if (
      broadcastSubmitted ||
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
        kind: 'success',
        title: 'Test Scheduled',
        message: `Scheduled for ${dateLabel} at ${timeLabel}. Check History for delivery status.`,
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
      broadcastSubmitted ||
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
    setScheduleAudience('test');
    setDraftId(null);
    setTitle('');
    setMessage('');
    setSelectedDestination(null);
    setIsTitleManuallyEdited(false);
    setIsMessageManuallyEdited(false);
    setIsPickingDestination(false);
    setOpenSchedulePicker(null);

    const defaultTime = new Date(
      Date.now() + 5 * 60 * 1000
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
        message: 'Your scheduled notification has been updated. The audience is unchanged.',
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
      broadcastSubmitted ||
      isPreparingBroadcast ||
      isSendingBroadcast ||
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
          message: 'Expo accepted the test notification and its history was saved. Check your device to confirm delivery.',
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

  async function handlePrepareBroadcast() {
    if (broadcastSubmitted || isPreparingBroadcast || isSendingBroadcast ||
        isSendingTest || isSavingDraft || isScheduling ||
        isSavingScheduled || editingScheduledId !== null ||
        !profile.isAdmin) {
      return;
    }

    if (!hasValidScheduleContent || !selectedDestination) {
      showFeedback({
        kind: 'warning',
        title: 'Incomplete Notification',
        message: 'Add a title, message, and valid destination Top 3.',
      });
      return;
    }

    const prepared = {
      title: title.trim(),
      message: message.trim(),
      destination: selectedDestination,
    };

    setIsPreparingBroadcast(true);
    try {
      const preview = await previewNotificationBroadcast(prepared);
      if (preview.deviceCount < 1) {
        showFeedback({
          kind: 'warning',
          title: 'No Registered Devices',
          message: 'No devices in this database are currently registered to receive push notifications.',
        });
        return;
      }
      setBroadcastConfirmation({ ...prepared, ...preview });
      setPendingConfirmation('sendAll');
    } catch (error) {
      showFeedback({
        kind: 'error',
        title: 'Unable to Preview Broadcast',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsPreparingBroadcast(false);
    }
  }

  async function handleConfirmBroadcast() {
    if (broadcastSendingRef.current || broadcastSubmitted || !broadcastConfirmation) return;
    broadcastSendingRef.current = true;
    // Lock this composed notification before the request. Even an error
    // may mean that Expo received it, so do not allow an accidental retry.
    setBroadcastSubmitted(true);
    setIsSendingBroadcast(true);
    setPendingConfirmation(null);
    const confirmed = broadcastConfirmation;
    // Never reuse the confirmation ID after an attempted send.
    setBroadcastConfirmation(null);
    try {
      const result = await sendNotificationBroadcast({
        title: confirmed.title,
        message: confirmed.message,
        destination: confirmed.destination,
        requestId: confirmed.requestId,
        expectedDeviceCount: confirmed.deviceCount,
      });
      const fullyAccepted = result.accepted === result.targetCount && result.failed === 0;
      setBroadcastOutcome(fullyAccepted ? 'queued' : 'review');
      showFeedback({
        kind: fullyAccepted ? 'success' : 'warning',
        title: fullyAccepted
          ? 'Broadcast queued'
          : result.accepted > 0
            ? 'Broadcast partially queued'
            : 'Broadcast not accepted',
        message: `${result.accepted} of ${result.targetCount} notifications accepted for delivery. ${result.failed > 0 ? 'Some were not accepted. Check History. ' : ''}${!result.historyRecorded ? 'History not confirmed. Check History. ' : ''}Delivery may take a moment.`,
      });
    } catch (error) {
      setBroadcastOutcome('review');
      showFeedback({
        kind: 'error',
        title: 'Broadcast Outcome Uncertain',
        message: `${error instanceof Error ? error.message : 'The request failed.'} Check Notification History before considering another send.`,
      });
    } finally {
      broadcastSendingRef.current = false;
      setIsSendingBroadcast(false);
    }
  }

  const viewSwitcher = (
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
          resetComposerHeader();
          setActiveView(view);
        }}
      />
    </View>
  );

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
      ]}
      edges={['left', 'right', 'bottom']}>
      <Reanimated.View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + SCREEN_HEADER_HEIGHT + 16,
            zIndex: 30,
          },
          stickyHeaderStyle,
        ]}>
        <ScreenHeader
          showBackButton
          overlay
          featheredBackdrop
          androidStatusBarGlass
        />
      </Reanimated.View>

      {activeView === 'history' ? (
        <NotificationHistory
          key="history"
          mode="history"
          onScroll={stickyScrollHandler}
          headerContent={viewSwitcher}
          contentTopInset={scrollContentTop}
        />
      ) : activeView === 'manage' ? (
        <NotificationHistory
          key="manage"
          mode="manage"
          onEditDraft={handleEditDraft}
          onEditScheduled={handleEditScheduled}
          onScroll={stickyScrollHandler}
          headerContent={viewSwitcher}
          contentTopInset={scrollContentTop}
        />
      ) : (
      <Reanimated.ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        onScroll={stickyScrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { paddingTop: scrollContentTop },
        ]}>
        {viewSwitcher}
        {draftId || title || message || selectedDestination ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new notification"
            disabled={
              isPreparingBroadcast ||
              isSendingBroadcast ||
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
            underlineColorAndroid="transparent"
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
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
            underlineColorAndroid="transparent"
            style={[
              styles.input,
              styles.messageInput,
              {
                backgroundColor: colors.surface,
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

          {!editingScheduledId ? (
            <View style={{ marginBottom: 16 }}>
              <AppText variant="formLabel">Recipients</AppText>
              <SegmentedControl<'test' | 'all'>
                value={scheduleAudience}
                options={[
                  { value: 'test', label: 'My Test Device' },
                  { value: 'all', label: 'All Users' },
                ]}
                onChange={(value) => {
                  setScheduleAudience(value);
                  setScheduleAllConfirmation(null);
                }}
              />
            </View>
          ) : (
            <AppText variant="label" tone="tertiary">
              Audience: {editingScheduledOriginal?.audience === 'all'
                ? 'All registered users' : 'My test device'}
            </AppText>
          )}
          <View style={styles.scheduleRow}>
            <View
              style={[
                styles.scheduleField,
                {
                  backgroundColor: colors.surface,
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
          {!ALLOW_TEST_SCHEDULING ? (
            <AppText variant="label" tone="tertiary">
              Scheduling availability is controlled by the server. Ask the administrator to verify delivery before enabling broadcasts.
            </AppText>
          ) : null}

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
                title={isScheduling ? 'Scheduling…'
                  : scheduleAudience === 'all' ? 'Schedule to All Users'
                  : !ALLOW_TEST_SCHEDULING ? 'Scheduling Unavailable'
                  : 'Schedule Test'}
                keepAppearanceWhenDisabled={
                  isScheduleTestReady &&
                  !isScheduling &&
                  (isSavingDraft || isSendingTest)
                }
                disabled={
                  broadcastSubmitted ||
                  isPreparingBroadcast ||
                  isSendingBroadcast ||
                  !(scheduleAudience === 'all'
                    ? profile.isAdmin && hasValidScheduleContent && !scheduleTimeError
                    : isScheduleTestReady) ||
                  isScheduling ||
                  isSavingDraft ||
                  isSendingTest
                }
            onPress={() => {
              void (scheduleAudience === 'all'
                ? handlePrepareScheduleAll()
                : handleScheduleTest());
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
                disabled={broadcastSubmitted || isPreparingBroadcast || isSendingBroadcast || isSavingDraft || isSendingTest || isScheduling}
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
                disabled={broadcastSubmitted || isPreparingBroadcast || isSendingBroadcast || isSendingTest || isSavingDraft || isScheduling}
                onPress={() => {
                  void handleSendTest();
                }}
              />
            </View>
          </View>
          {ALLOW_IMMEDIATE_BROADCAST ? (
            <>
              <PrimaryButton
                title={isPreparingBroadcast
                  ? 'Checking Audience…'
                  : isSendingBroadcast
                    ? 'Sending Broadcast…'
                    : broadcastSubmitted
                      ? broadcastOutcome === 'queued'
                        ? 'Broadcast Queued'
                        : 'Check History'
                      : 'Send to All'}
                disabled={
                  broadcastSubmitted || isPreparingBroadcast || isSendingBroadcast ||
                  isSavingDraft || isSendingTest || isScheduling ||
                  isSavingScheduled || !hasValidScheduleContent
                }
                onPress={() => { void handlePrepareBroadcast(); }}
              />
              <AppText
                variant="label"
                tone="tertiary"
                style={styles.note}>
                {broadcastSubmitted
                  ? broadcastOutcome === 'queued'
                    ? 'To send another notification, select New Notification above. See History for details.'
                    : 'Check History before preparing another notification. Select New Notification to start fresh.'
                  : 'Test sends only to this device. Send to All requires confirmation before an immediate broadcast.'}
              </AppText>
            </>
          ) : (
            <AppText
              variant="label"
              tone="tertiary"
              style={styles.note}>
              Send Test delivers to this device. To notify all registered devices,
              choose All Users above and schedule a delivery time. Immediate
              all-user sending is not enabled in this release.
            </AppText>
          )}
            </>
          )}
        </View>
      </Reanimated.ScrollView>
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
          pendingConfirmation === 'scheduleAll'
            ? 'Schedule for All Users?'
            : pendingConfirmation === 'sendAll'
            ? 'Confirm Broadcast to All?'
            : pendingConfirmation === 'new'
              ? 'New Notification'
            : pendingConfirmation === 'historyUnconfirmed'
              ? 'Test Accepted — History Not Confirmed'
              : 'Discard Changes?'
        }
        message={
          pendingConfirmation === 'scheduleAll'
            ? `Schedule this notification for ${scheduleAllConfirmation?.deviceCount ?? 0} currently registered devices belonging to ${scheduleAllConfirmation?.userCount ?? 0} users? This will automatically send at the chosen time once broadcast delivery is enabled on the server. The audience may change before delivery.`
            : pendingConfirmation === 'sendAll'
            ? `Send this notification to ${broadcastConfirmation?.deviceCount ?? 0} registered devices belonging to ${broadcastConfirmation?.userCount ?? 0} users in the connected database? This cannot be undone. Some devices may be registered more than once per user.`
            : pendingConfirmation === 'new'
              ? 'Start a new notification? Unsaved changes in this form will be lost. Your previously saved drafts will remain in Manage.'
            : pendingConfirmation === 'historyUnconfirmed'
              ? 'Expo accepted the notification, but its history could not be confirmed. Check your iPhone before considering another send.'
              : 'You have unsaved changes to this notification.'
        }
        actions={
          pendingConfirmation === 'scheduleAll'
            ? [
                { label: 'Confirm Schedule for All',
                  onPress: () => { void handleConfirmScheduleAll(); } },
                { label: 'Cancel', variant: 'cancel',
                  onPress: () => {
                    setPendingConfirmation(null);
                    setScheduleAllConfirmation(null);
                  } },
              ]
            : pendingConfirmation === 'sendAll'
            ? [
                {
                  label: 'Send to All Devices',
                  variant: 'destructive',
                  onPress: () => { void handleConfirmBroadcast(); },
                },
                {
                  label: 'Cancel',
                  variant: 'cancel',
                  onPress: () => {
                    setPendingConfirmation(null);
                    setBroadcastConfirmation(null);
                  },
                },
              ]
            : pendingConfirmation === 'new'
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
            if (pendingConfirmation === 'sendAll') {
              setBroadcastConfirmation(null);
            }
            if (pendingConfirmation === 'scheduleAll') {
              setScheduleAllConfirmation(null);
            }
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
    paddingTop: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  field: {
    marginTop: 24,
    gap: 8,
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
    ...TEXT_STYLES.bodyLarge,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  messageInput: {
    minHeight: 105,
  },
  destinationSelector: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    borderRadius: 12,
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
