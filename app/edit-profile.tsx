import PageHeader from '@/components/page-header';
import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
import { COLORS } from '@/constants/colors';
import { useProfile } from '@/context/profile-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_AVATAR_FILE_SIZE =
  5 * 1024 * 1024;

export default function EditProfileScreen() {
  const { profile, updateProfile } = useProfile();

  const scrollViewRef = useRef<ScrollView>(null);

  const [displayName, setDisplayName] = useState(
    profile.displayName
  );

  const [username, setUsername] = useState(
    profile.username
  );

  const [bio, setBio] = useState(
    profile.bio ?? ''
  );

  const [avatarUrl, setAvatarUrl] = useState(
    profile.avatarUrl ?? ''
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const trimmedDisplayName =
    displayName.trim();

  const trimmedUsername = username
    .trim()
    .replace(/^@+/, '');

  const canSave =
    trimmedDisplayName.length > 0 &&
    trimmedUsername.length > 0 &&
    !isSaving;

  async function chooseAvatar() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to choose a profile picture.'
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (
      result.canceled ||
      result.assets.length === 0
    ) {
      return;
    }

    const asset = result.assets[0];

    if (
      typeof asset.fileSize === 'number' &&
      asset.fileSize >
        MAX_AVATAR_FILE_SIZE
    ) {
      Alert.alert(
        'Image too large',
        'Please choose an image smaller than 5 MB.'
      );

      return;
    }

    setAvatarUrl(asset.uri);
  }

  function focusBioField() {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 250);
  }

  async function saveProfile() {
    if (!canSave) {
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      await updateProfile({
        displayName: trimmedDisplayName,
        username: trimmedUsername,
        bio: bio.trim(),
        avatarUrl:
          avatarUrl || undefined,
      });

      router.back();
    } catch (error) {
      console.error(
        'Failed to save profile:',
        error
      );

      Alert.alert(
        'Unable to save profile',
        'Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader showBackButton />

      <PageHeader
        title="Edit Profile"
        align="center"
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={Keyboard.dismiss}
            accessible={false}>
            <View style={styles.avatarSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.avatarButton,
                  pressed &&
                    !isSaving &&
                    styles.avatarButtonPressed,
                  isSaving &&
                    styles.avatarButtonDisabled,
                ]}
                onPress={chooseAvatar}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                accessibilityHint="Opens your photo library">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {trimmedDisplayName
                      .charAt(0)
                      .toUpperCase() || '?'}
                  </Text>
                )}

                <View style={styles.cameraBadge}>
                  <Ionicons
                    name="camera"
                    size={17}
                    color="#FFFFFF"
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={chooseAvatar}
                disabled={isSaving}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
                style={({ pressed }) => [
                  styles.avatarHelpButton,
                  pressed &&
                    !isSaving &&
                    styles.avatarHelpButtonPressed,
                ]}>
                <Text style={styles.avatarHelpText}>
                  Tap photo to change
                </Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Display name
              </Text>

              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={
                  COLORS.tertiaryText
                }
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSaving}
                maxLength={50}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Username
              </Text>

              <View style={styles.usernameInput}>
                <Text style={styles.atSymbol}>
                  @
                </Text>

                <TextInput
                  style={styles.usernameTextInput}
                  value={username}
                  onChangeText={(value) =>
                    setUsername(
                      value.replace(/\s/g, '')
                    )
                  }
                  placeholder="username"
                  placeholderTextColor={
                    COLORS.tertiaryText
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSaving}
                  maxLength={30}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Bio
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                ]}
                value={bio}
                onChangeText={setBio}
                onFocus={focusBioField}
                placeholder="Tell people about your taste."
                placeholderTextColor={
                  COLORS.tertiaryText
                }
                editable={!isSaving}
                multiline
                textAlignVertical="top"
                maxLength={160}
              />

              <Text style={styles.characterCount}>
                {bio.length}/160
              </Text>
            </View>
          </Pressable>
        </ScrollView>

        <View style={styles.bottomBar}>
          <PrimaryButton
            title={
              isSaving
                ? 'Saving...'
                : 'Save Profile'
            }
            onPress={saveProfile}
            disabled={!canSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },

  avatarButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  avatarButtonPressed: {
    opacity: 0.75,
  },

  avatarButtonDisabled: {
    opacity: 0.6,
  },

  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },

  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.text,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarHelpButton: {
    marginTop: 12,
  },

  avatarHelpButtonPressed: {
    opacity: 0.6,
  },

  avatarHelpText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.tertiaryText,
    textAlign: 'center',
  },

  field: {
    marginBottom: 24,
  },

  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: COLORS.text,
  },

  usernameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },

  atSymbol: {
    fontSize: 17,
    color: COLORS.tertiaryText,
  },

  usernameTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    color: COLORS.text,
  },

  bioInput: {
    minHeight: 120,
  },

  characterCount: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 13,
    color: COLORS.tertiaryText,
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
});