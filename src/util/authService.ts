import { Platform, NativeModules } from 'react-native';

const isWeb = Platform.OS === 'web';
const USER_ID_KEY = 'user_id';
const SESSION_ID_KEY = 'session_id';

// Helper to safely get SecureStore
const getSecureStore = () => {
    if (isWeb) return null;
    try {
        // Check if the native module exists mostly to avoid the noisy "Cannot find native module" error
        // that Expo's require throws even inside a try-catch.
        // We look for 'ExpoSecureStore' in NativeModules or global expo modules.
        // However, a simple try-require is usually best, but if it's logging, we can try to be defensive.

        // Strategy: Just suppress the error log if possible? No, we can't suppress system logs.
        // Strategy: Allow the error to happen ONCE and cache the result?
        // But the user sees it every time.

        // Defensive check: If the native module is missing, NativeModules.ExpoSecureStore will be undefined.
        // We check this to avoid calling require() which triggers a loud "Cannot find native module" error log.
        if (!NativeModules.ExpoSecureStore) {
            return null;
        }
        return require('expo-secure-store');
    } catch (e) {
        return null;
    }
};

export const saveAuthData = async (userId: string, sessionId: string) => {
    if (isWeb) {
        localStorage.setItem(USER_ID_KEY, userId);
        localStorage.setItem(SESSION_ID_KEY, sessionId);
        return;
    }
    const SecureStore = getSecureStore();
    if (SecureStore) {
        try {
            await SecureStore.setItemAsync(USER_ID_KEY, userId);
            await SecureStore.setItemAsync(SESSION_ID_KEY, sessionId);
        } catch (error) {
            console.log("Note: Secure persistence unavailable (Native module missing). Login not saved.");
        }
    }
};

export const getAuthData = async () => {
    if (isWeb) {
        const userId = localStorage.getItem(USER_ID_KEY);
        const sessionId = localStorage.getItem(SESSION_ID_KEY);
        return { userId, sessionId };
    }
    const SecureStore = getSecureStore();
    if (SecureStore) {
        try {
            const userId = await SecureStore.getItemAsync(USER_ID_KEY);
            const sessionId = await SecureStore.getItemAsync(SESSION_ID_KEY);
            return { userId, sessionId };
        } catch (error) {
            // Silently fail to fallback
            return { userId: null, sessionId: null };
        }
    }
    return { userId: null, sessionId: null };
};

export const getUserId = async (): Promise<string | null> => {
    if (isWeb) {
        return localStorage.getItem(USER_ID_KEY);
    }
    const SecureStore = getSecureStore();
    if (SecureStore) {
        try {
            return await SecureStore.getItemAsync(USER_ID_KEY);
        } catch (error) {
            return null;
        }
    }
    return null;
};

export const clearAuthData = async () => {
    if (isWeb) {
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(SESSION_ID_KEY);
        return;
    }
    const SecureStore = getSecureStore();
    if (SecureStore) {
        try {
            await SecureStore.deleteItemAsync(USER_ID_KEY);
            await SecureStore.deleteItemAsync(SESSION_ID_KEY);
        } catch (error) {
            // Ignore
        }
    }
};
