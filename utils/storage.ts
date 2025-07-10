// utils/storage.ts
import { Platform } from 'react-native';
let storage: any;
if (Platform.OS === 'web') {
  storage = {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
  };
} else {
  storage = require('@react-native-async-storage/async-storage').default;
}

const TOKEN_KEY = 'token';
const EMAIL_KEY = 'user_email';
const GUEST_CART_KEY = 'guest_cart';

export const saveEmail = async (email: string) => {
  try {
    await storage.setItem(EMAIL_KEY, email);
    return true;
  } catch (e) {
    console.error('Error saving email:', e);
    return false;
  }
};

export const getEmail = async (): Promise<string | null> => {
  try {
    return await storage.getItem(EMAIL_KEY);
  } catch (e) {
    console.error('Error getting email:', e);
    return null;
  }
};

export const removeEmail = async () => {
  try {
    await storage.removeItem(EMAIL_KEY);
  } catch (e) {
    console.error('Error removing email:', e);
  }
};

export const saveToken = async (token: string) => {
  try {
    await storage.setItem(TOKEN_KEY, token);
    return true;
  } catch (e) {
    console.error('Error saving token:', e);
    return false;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await storage.getItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error getting token:', e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await storage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error removing token:', e);
  }
};

export const getGuestCart = async (): Promise<string> => {
  try {
    return await storage.getItem(GUEST_CART_KEY) || "[]";
  } catch (e) {
    console.error('Error getting guest cart:', e);
    return "[]";
  }
};

export const saveGuestCart = async (cartData: string) => {
  try {
    await storage.setItem(GUEST_CART_KEY, cartData);
  } catch (e) {
    console.error('Error saving guest cart:', e);
  }
};
