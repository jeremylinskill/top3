import ActionSheet from '@/components/action-sheet';
import AppText from '@/components/app-text';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';
import { usePreviewSheetColors } from '@/hooks/use-preview-sheet-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
  const sheetColors = usePreviewSheetColors();
  const invertedTextTone =
    useColorScheme() === 'dark'
      ? 'onHighlight'
      : 'onDark';

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
    <ActionSheet
      visible={visible}
      title={isSubmitted ? 'Thank you!' : `Suggest a ${ROLE_LABELS[role]}`}
      message={
        isSubmitted
          ? "Your musician suggestion has been received. We'll review it for inclusion in Top 3."
          : undefined
      }
      keyboardAvoiding={!isSubmitted}
      dismissDisabled={isSubmitting}
      onClose={handleClose}
      actions={
        isSubmitted
          ? [{ label: 'Done', onPress: handleClose }]
          : [
              {
                label: isSubmitting ? 'Sending...' : 'Send Suggestion',
                onPress: () => { void handleSubmit(); },
                disabled: !name.trim() || isSubmitting,
              },
              {
                label: 'Cancel',
                variant: 'cancel',
                onPress: handleClose,
                disabled: isSubmitting,
              },
            ]
      }>
      {!isSubmitted ? (
        <View style={styles.form}>
          <View style={styles.field}>
            <AppText variant="formLabel" tone={invertedTextTone}>
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
              placeholderTextColor={sheetColors.tertiaryText}
              returnKeyType="next"
              style={[
                styles.input,
                {
                  color: sheetColors.primaryText,
                  backgroundColor: sheetColors.control,
                  borderColor: sheetColors.border,
                },
              ]}
              value={name}
            />
          </View>

          <View style={styles.field}>
            <AppText variant="formLabel" tone={invertedTextTone}>
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
              placeholderTextColor={sheetColors.tertiaryText}
              style={[
                styles.input,
                styles.detailsInput,
                {
                  color: sheetColors.primaryText,
                  backgroundColor: sheetColors.control,
                  borderColor: sheetColors.border,
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
        </View>
      ) : null}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    // Give the title breathing room before the first form label.
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  field: {
    gap: SPACING.xs,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    fontSize: 16,
  },
  detailsInput: {
    minHeight: 64,
  },
  error: {
    textAlign: 'center',
  },
});
