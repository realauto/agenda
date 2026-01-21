import Constants from 'expo-constants';

const getApiUrl = (): string => {
  // Check for environment variable first
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // Default to localhost for development
  return 'http://localhost:3000/api';
};

export const config = {
  apiUrl: getApiUrl(),
  tokenRefreshThreshold: 60 * 1000, // Refresh token 1 minute before expiry
  feedPageSize: 20,
  maxAttachments: 10,
  maxContentLength: 5000,
};
