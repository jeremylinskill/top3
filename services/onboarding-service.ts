import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_WELCOME_KEY =
  'top3-has-seen-welcome';

const AWAITING_EMAIL_VERIFICATION_KEY =
  'top3-awaiting-email-verification';

const AWAITING_EMAIL_VERIFICATION_EMAIL_KEY =
  'top3-awaiting-email-verification-email';

export async function hasSeenWelcome() {
  try {
    const storedValue =
      await AsyncStorage.getItem(
        HAS_SEEN_WELCOME_KEY
      );

    return storedValue === 'true';
  } catch (error) {
    console.error(
      'Failed to load welcome status:',
      error
    );

    return false;
  }
}

export async function markWelcomeAsSeen() {
  try {
    await AsyncStorage.setItem(
      HAS_SEEN_WELCOME_KEY,
      'true'
    );
  } catch (error) {
    console.error(
      'Failed to save welcome status:',
      error
    );

    throw error;
  }
}

export async function resetWelcomeStatus() {
  try {
    await AsyncStorage.removeItem(
      HAS_SEEN_WELCOME_KEY
    );
  } catch (error) {
    console.error(
      'Failed to reset welcome status:',
      error
    );

    throw error;
  }
}

export async function isAwaitingEmailVerification() {
  try {
    const storedValue =
      await AsyncStorage.getItem(
        AWAITING_EMAIL_VERIFICATION_KEY
      );

    return storedValue === 'true';
  } catch (error) {
    console.error(
      'Failed to load email verification status:',
      error
    );

    return false;
  }
}

export async function setAwaitingEmailVerification(
  isAwaiting: boolean
) {
  try {
    if (isAwaiting) {
      await AsyncStorage.setItem(
        AWAITING_EMAIL_VERIFICATION_KEY,
        'true'
      );
    } else {
      await AsyncStorage.multiRemove([
        AWAITING_EMAIL_VERIFICATION_KEY,
        AWAITING_EMAIL_VERIFICATION_EMAIL_KEY,
      ]);
    }
  } catch (error) {
    console.error(
      'Failed to save email verification status:',
      error
    );

    throw error;
  }
}

export async function getAwaitingEmailVerificationEmail() {
  try {
    return await AsyncStorage.getItem(
      AWAITING_EMAIL_VERIFICATION_EMAIL_KEY
    );
  } catch (error) {
    console.error(
      'Failed to load email verification email:',
      error
    );

    return null;
  }
}

export async function setAwaitingEmailVerificationEmail(
  email: string
) {
  try {
    await AsyncStorage.setItem(
      AWAITING_EMAIL_VERIFICATION_EMAIL_KEY,
      email.trim().toLowerCase()
    );
  } catch (error) {
    console.error(
      'Failed to save email verification email:',
      error
    );

    throw error;
  }
}