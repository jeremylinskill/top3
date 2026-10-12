import AppText from '@/components/app-text';
import PrimaryButton from '@/components/primary-button';
import { RADIUS } from '@/constants/radius';
import { useAppColors } from '@/hooks/use-app-colors';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SuggestMusicianRole =
  | 'vocalist'
  | 'guitarist'
  | 'drummer'
  | 'bassist'
  | 'mc'
  | 'dj';

type Props = {
  visible: boolean;
  role: SuggestMusicianRole;
  initialName?: string;
  onClose: () => void;
  onSubmit: (
    name: string,
    knownFor: string
  ) => Promise<void>;
};

const ROLE_LABELS: Record<SuggestMusicianRole, string> = {
  vocalist: 'Vocalist',
  guitarist: 'Guitarist',
  drummer: 'Drummer',
  bassist: 'Bassist',
  mc: 'MC',
  dj: 'DJ',
};

export default function SuggestMusicianSheet({
  visible,
  role,
  initialName = '',
  onClose,
  onSubmit,
}: Props) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [knownFor, setKnownFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setName(initialName.trim().slice(0, 120));
    setKnownFor('');
    setIsSubmitted(false);
    setError(null);
  }, [visible, initialName, role]);

  function handleClose() {
    if (isSubmitting) return;
    Keyboard.dismiss();
    onClose();
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedKnownFor = knownFor.trim();

    if (!trimmedName || isSubmitting) return;

    Keyboard.dismiss();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(trimmedName, trimmedKnownFor);
      setIsSubmitted(true);
    } catch {
      setError(
        'Your suggestion could not be sent. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Close musician suggestion"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            {isSubmitted ? (
              <>
                <AppText
                  variant="pageTitle"
                  style={styles.title}>
                  Thank you!
                </AppText>

                <AppText
                  variant="bodyLarge"
                  tone="tertiary"
                  style={styles.description}>
                  Your musician suggestion has been received.
                  We'll review it for inclusion in Top 3.
                </AppText>

                <PrimaryButton
                  title="Done"
                  onPress={handleClose}
                />
              </>
            ) : (
              <>
                <AppText
                  variant="pageTitle"
                  style={styles.title}>
                  Suggest a {ROLE_LABELS[role]}
                </AppText>

                <AppText
                  variant="body"
                  tone="tertiary"
                  style={styles.description}>
                  Can't find someone? Let us know who we're missing.
                </AppText>

                <View style={styles.field}>
                  <AppText variant="formLabel">
                    Musician name
                  </AppText>

                  <TextInput
                    accessibilityLabel="Musician name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    maxLength={120}
                    onChangeText={setName}
                    placeholder="Enter musician's name"
                    placeholderTextColor={colors.tertiaryText}
                    returnKeyType="next"
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    value={name}
                  />
                </View>

                <View style={styles.field}>
                  <AppText variant="formLabel">
                    Known for (optional)
                  </AppText>

                  <TextInput
                    accessibilityLabel="Known for"
                    autoCapitalize="sentences"
                    editable={!isSubmitting}
                    maxLength={300}
                    multiline
                    onChangeText={setKnownFor}
                    placeholder="Band, recordings, or other details"
                    placeholderTextColor={colors.tertiaryText}
                    style={[
                      styles.input,
                      styles.detailsInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    textAlignVertical="top"
                    value={knownFor}
                  />
                </View>

                {error ? (
                  <AppText
                    variant="body"
                    tone="destructive"
                    style={styles.error}>
                    {error}
                  </AppText>
                ) : null}

                <PrimaryButton
                  title={isSubmitting ? 'Sending...' : 'Send Suggestion'}
                  onPress={handleSubmit}
                  disabled={!name.trim() || isSubmitting}
                />

                <Pressable
                  onPress={handleClose}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel suggestion"
                  style={styles.cancelButton}>
                  <AppText
                    variant="body"
                    tone="tertiary">
                    Cancel
                  </AppText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  field: {
    marginBottom: 20,
    gap: 8,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    fontSize: 16,
  },
  detailsInput: {
    minHeight: 96,
  },
  error: {
    textAlign: 'center',
    marginBottom: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
});
