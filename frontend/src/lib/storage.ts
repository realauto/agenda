import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'projectlog_access_token';
const REFRESH_TOKEN_KEY = 'projectlog_refresh_token';
const DARK_MODE_KEY = 'projectlog_dark_mode';

// Web fallback using localStorage
const webStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

const storage = Platform.OS === 'web' ? webStorage : SecureStore;

export async function getAccessToken(): Promise<string | null> {
  try {
    return await storage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  try {
    await storage.setItem(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store access token:', error);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await storage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await storage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store refresh token:', error);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await storage.deleteItem(ACCESS_TOKEN_KEY);
    await storage.deleteItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setAccessToken(accessToken);
  await setRefreshToken(refreshToken);
}

export async function getDarkMode(): Promise<boolean> {
  try {
    const value = await storage.getItem(DARK_MODE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setDarkMode(isDark: boolean): Promise<void> {
  try {
    await storage.setItem(DARK_MODE_KEY, String(isDark));
  } catch (error) {
    console.error('Failed to store dark mode preference:', error);
  }
}
