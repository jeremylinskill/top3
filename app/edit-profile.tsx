import PrimaryButton from '@/components/primary-button';
import ScreenHeader from '@/components/screen-header';
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

export default function EditProfileScreen() {
  const { profile, updateProfile } = useProfile();

  const scrollViewRef = useRef<ScrollView>(null);

  const [displayName, setDisplayName] = useState(
    profile.displayName
  );

  const [username, setUsername] = useState(
    profile.username
  );

  const [bio, setBio] = useState(profile.bio ?? '');

  const [avatarUrl, setAvatarUrl] = useState(
    profile.avatarUrl ?? ''
  );

  const trimmedDisplayName = displayName.trim();

  const trimmedUsername = username
    .trim()
    .replace(/^@+/, '');

  const canSave =
    trimmedDisplayName.length > 0 &&
    trimmedUsername.length > 0;

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
      !result.canceled &&
      result.assets.length > 0
    ) {
      setAvatarUrl(result.assets[0].uri);
    }
  }

  function focusBioField() {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 250);
  }

  function saveProfile() {
    if (!canSave) {
      return;
    }

    Keyboard.dismiss();

    updateProfile({
      displayName: trimmedDisplayName,
      username: trimmedUsername,
      bio: bio.trim(),
      avatarUrl: avatarUrl || undefined,
    });

    router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Edit Profile"
        showBackButton
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
                style={styles.avatarButton}
                onPress={chooseAvatar}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo">
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
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Username
              </Text>

              <View style={styles.usernameInput}>
                <Text style={styles.atSymbol}>@</Text>

                <TextInput
                  style={styles.usernameTextInput}
                  value={username}
                  onChangeText={(value) =>
                    setUsername(
                      value.replace(/\s/g, '')
                    )
                  }
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>

              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                ]}
                value={bio}
                onChangeText={setBio}
                onFocus={focusBioField}
                placeholder="Tell people about your taste."
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
            title="Save Profile"
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
    backgroundColor: '#FAFAFA',
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
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
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
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
    backgroundColor: '#222222',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: {
    marginBottom: 24,
  },

  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },

  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: '#222222',
  },

  usernameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },

  atSymbol: {
    fontSize: 17,
    color: '#777777',
  },

  usernameTextInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    color: '#222222',
  },

  bioInput: {
    minHeight: 120,
  },

  characterCount: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 13,
    color: '#888888',
  },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
});