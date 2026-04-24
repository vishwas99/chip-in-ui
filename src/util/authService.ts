import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';
const USER_ID_KEY = 'user_id';
const SESSION_ID_KEY = 'session_id';

export const saveAuthData = async (userId: string, sessionId: string) => {
    try {
        if (isWeb) {
            localStorage.setItem(USER_ID_KEY, userId);
            localStorage.setItem(SESSION_ID_KEY, sessionId);
        } else {
            await AsyncStorage.setItem(USER_ID_KEY, userId);
            await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
            console.log('[Auth] Saved auth data for userId:', userId);
        }
    } catch (error) {
        console.error('[Auth] Failed to save auth data:', error);
    }
};

export const getAuthData = async (): Promise<{ userId: string | null; sessionId: string | null }> => {
    try {
        if (isWeb) {
            const userId = localStorage.getItem(USER_ID_KEY);
            const sessionId = localStorage.getItem(SESSION_ID_KEY);
            return { userId, sessionId };
        } else {
            const userId = await AsyncStorage.getItem(USER_ID_KEY);
            const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
            console.log('[Auth] Retrieved auth data - userId:', userId, '| token present:', !!sessionId);
            return { userId, sessionId };
        }
    } catch (error) {
        console.error('[Auth] Failed to get auth data:', error);
        return { userId: null, sessionId: null };
    }
};

export const getUserId = async (): Promise<string | null> => {
    try {
        if (isWeb) return localStorage.getItem(USER_ID_KEY);
        return await AsyncStorage.getItem(USER_ID_KEY);
    } catch (error) {
        return null;
    }
};

export const clearAuthData = async () => {
    try {
        if (isWeb) {
            localStorage.removeItem(USER_ID_KEY);
            localStorage.removeItem(SESSION_ID_KEY);
        } else {
            await AsyncStorage.removeItem(USER_ID_KEY);
            await AsyncStorage.removeItem(SESSION_ID_KEY);
            console.log('[Auth] Auth data cleared.');
        }
    } catch (error) {
        console.error('[Auth] Failed to clear auth data:', error);
    }
};
