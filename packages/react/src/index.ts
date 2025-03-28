// Export components
export { CookieBanner } from './components/cookie-banner/cookie-banner';
export { ConsentManagerWidget } from './components/consent-manager-widget/consent-manager-widget';
export { ConsentManagerDialog } from './components/consent-manager-dialog/consent-manager-dialog';
export { ConsentManagerProvider } from './providers/consent-manager-provider';

// Export hooks
export { useConsentManager } from './hooks/use-consent-manager';
export { useTranslations } from './hooks/use-translations';
export { useColorScheme } from './hooks/use-color-scheme';

// Export new client hook
export { useConsentClient } from './hooks/use-consent-client';

// Export types
export type { ConsentManagerProviderProps } from './types/consent-manager';

// Export utilities
export * from './utils/translations';
