export const c15tClientExample = `
import { createConsentClient } from '@c15t/core';

export const c15tClient = createConsentClient({
  baseURL: '/api/c15t-demo',
  defaultPreferences: {
    analytics: true,
    marketing: true,
    preferences: true,
  },
});
`;
