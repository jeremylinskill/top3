import AppText from '@/components/app-text';
import NotificationDestinationPicker from '@/components/notification-destination-picker';
import AuthProviderButton from '@/components/auth-provider-button';
import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { TOP3_CATEGORIES } from '@/constants/top3-categories';
import { RADIUS } from '@/constants/radius';
import { useCollectionOptions } from '@/context/collection-options-context';
import { useProfile } from '@/context/profile-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { getExistingPushToken } from '@/lib/notifications';
import { isPushTokenRegistered } from '@/lib/supabase/push-tokens';
import { sendCampaignTestNotification } from '@/lib/supabase/campaign-notifications';
import { Ionicons } from '@expo/vector-icons';
import {
  NotificationDestination,
  resolveDestinationOption,
} from '@/types/notification-destination';
import { useState } from 'react';
import { buildNotificationCopy } from '@/utils/build-notification-copy';
import {
  Alert,
  Keyboard,
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

export default function NotificationComposerScreen() {
  const colors = useAppColors();
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

  const selectedOption = selectedDestination
    ? resolveDestinationOption(selectedDestination, options)
    : null;

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

  async function handleSendTest() {
    if (isSendingTest || !profile.isAdmin) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage || !selectedDestination) {
      Alert.alert(
        'Incomplete Notification',
        'Enter a title and message, then choose a destination Top 3.'
      );
      return;
    }

    if (
      selectedDestination.kind !== 'overall' &&
      !selectedOption
    ) {
      Alert.alert(
        'Destination Unavailable',
        'This destination is no longer available. Please choose another Top 3.'
      );
      return;
    }

    setIsSendingTest(true);

    try {
      const expoPushToken = await getExistingPushToken();

      if (!expoPushToken) {
        Alert.alert(
          'Notifications Are Off',
          'Enable notifications for Top 3 in your iPhone Settings and in the app before sending a test.'
        );
        return;
      }

      const registered =
        await isPushTokenRegistered(expoPushToken);

      if (!registered) {
        Alert.alert(
          'Device Not Registered',
          'Turn on push notifications in Top 3 Settings to register this device, then try again.'
        );
        return;
      }

      await sendCampaignTestNotification({
        title: cleanTitle,
        message: cleanMessage,
        destination: selectedDestination,
        expoPushToken,
      });

      Alert.alert(
        'Test Accepted',
        'Expo accepted the test notification. Check your iPhone to confirm delivery.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Send Test',
        error instanceof Error
          ? error.message
          : 'Please try again.'
      );
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

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.composerHeader}>
          <PageHeader
            title="Send Notification"
            subtitle="Invite users to share their Top 3."
          />
        </View>

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
            placeholder="What are your Top 3 Tom Cruise movies?"
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
            placeholder="With Digger hitting theatres, rank your three favourites!"
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

        <View style={styles.actions}>
          <AuthProviderButton
            title={isSendingTest ? 'Sending Test…' : 'Send Test'}
            variant="secondary"
            disabled={isSendingTest}
            onPress={() => {
              void handleSendTest();
            }}
          />
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
        </View>
      </ScrollView>

      <NotificationDestinationPicker
        visible={isPickingDestination}
        selected={selectedDestination}
        onSelect={handleSelectDestination}
        onClose={() => setIsPickingDestination(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  composerHeader: {
    marginHorizontal: -20,
  },
  field: {
    marginTop: 24,
    gap: 10,
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
  actions: {
    marginTop: 30,
    gap: 12,
  },
  note: {
    textAlign: 'center',
    marginTop: 4,
  },
});
