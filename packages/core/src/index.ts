/**
 * @packageDocumentation
 * Main entry point for the c15t consent management system.
 */

// Re-export store
export { createConsentManagerStore } from './store';
export type { PrivacyConsentState } from './store.type';
export type { StoreConfig } from './store';

// Re-export all utilities
export * from './libs/consent-utils';
export { createTrackingBlocker } from './libs/tracking-blocker';
export type { TrackingBlockerConfig } from './libs/tracking-blocker';

// Export the client
export { c15tClient, createConsentClient } from './client';

// Re-export client types
export type {
	FetchOptions,
	ResponseContext,
	c15tClientOptions,
	c15tClientPlugin,
} from './types/client';

export { defaultTranslationConfig } from './translations';
