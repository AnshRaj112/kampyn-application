import Constants from 'expo-constants';

const resolvedBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!resolvedBackendUrl) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL is not set. Please define it in your environment (.env) before starting the app.');
}

export const config = {
  backendUrl: resolvedBackendUrl
}; 