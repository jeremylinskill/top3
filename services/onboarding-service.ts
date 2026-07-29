import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_WELCOME_KEY =
  'top3-has-seen-welcome';

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