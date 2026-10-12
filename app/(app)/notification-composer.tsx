import AppText from '@/components/app-text';
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
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_TITLE_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 220;

export default function NotificationComposerScreen() {
  const colors = useAppColors();
  const { profile } = useProfile();
  const { options } = useCollectionOptions();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [themeQuery, setThemeQuery] = useState('');
  const [selectedThemeId, setSelectedThemeId] =
    useState<string | null>(null);
  const [isChoosingTheme, setIsChoosingTheme] =
    useState(false);

  const [isSendingTest, setIsSendingTest] = useState(false);

  const themes = useMemo(
    () =>
      options
        .filter((option) =>
          option.active && option.kind === 'theme'
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [options]
  );

  const selectedTheme = themes.find(
    (theme) => theme.id === selectedThemeId
  );

  const matchingThemes = themes
    .filter((theme) => {
      const category = TOP3_CATEGORIES.find(
        (item) => item.id === theme.categoryId
      );

      const query = themeQuery.trim().toLowerCase();

      return (
        !query ||
        theme.name.toLowerCase().includes(query) ||
        category?.name.toLowerCase().includes(query)
      );
    })
    .slice(0, 25);

  function getThemeLabel(categoryId: string, name: string) {
    const category = TOP3_CATEGORIES.find(
      (item) => item.id === categoryId
    );

    return `${category?.name ?? categoryId} · ${name}`;
  }

  async function handleSendTest() {
    if (isSendingTest || !profile.isAdmin) {
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage || !selectedTheme) {
      Alert.alert(
        'Incomplete Notification',
        'Enter a title and message, then choose a destination Top 3.'
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
        categoryId: selectedTheme.categoryId,
        themeSlug: selectedTheme.slug,
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
            Notification title
          </AppText>
          <TextInput
            accessibilityLabel="Notification title"
            value={title}
            onChangeText={setTitle}
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
            onChangeText={setMessage}
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

        <View style={styles.field}>
          <AppText variant="formLabel">
            Destination Top 3
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose destination Top 3"
            onPress={() => setIsChoosingTheme(!isChoosingTheme)}
            style={[
              styles.input,
              styles.themeSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <AppText variant="body">
              {selectedTheme
                ? getThemeLabel(
                    selectedTheme.categoryId,
                    selectedTheme.name
                  )
                : 'Choose a theme'}
            </AppText>
          </Pressable>

          {isChoosingTheme ? (
            <View
              style={[
                styles.themeResults,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <TextInput
                accessibilityLabel="Search Top 3 themes"
                value={themeQuery}
                onChangeText={setThemeQuery}
                placeholder="Search themes"
                placeholderTextColor={colors.tertiaryText}
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {matchingThemes.map((theme) => (
                <Pressable
                  key={theme.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedThemeId(theme.id);
                    setIsChoosingTheme(false);
                    setThemeQuery('');
                  }}
                  style={[
                    styles.themeRow,
                    { borderBottomColor: colors.border },
                  ]}>
                  <AppText variant="body">
                    {getThemeLabel(
                      theme.categoryId,
                      theme.name
                    )}
                  </AppText>
                </Pressable>
              ))}

              {matchingThemes.length === 0 ? (
                <AppText
                  variant="body"
                  tone="tertiary"
                  style={styles.noThemes}>
                  No matching themes.
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>

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
  themeSelector: {
    justifyContent: 'center',
  },
  themeResults: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 4,
  },
  themeRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noThemes: {
    padding: 12,
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
