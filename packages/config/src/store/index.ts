/**
 * Storage configuration utilities for c15t consent management
 */

import type { StorageConfig } from './types';

export * from './types';

/**
 * Resolve store configuration with defaults
 * 
 * @param config - Partial store configuration
 * @returns Fully resolved store configuration
 */
export function resolveStoreConfig(
  config: Partial<StorageConfig> = {}
): StorageConfig {
  return {
    namespace: config.namespace || 'c15tStore',
    trackingBlockerConfig: {
      enabledByDefault: false,
      blockedDomains: [],
      allowedDomains: [],
      ...config.trackingBlockerConfig,
    },
    consentBannerApiUrl: config.consentBannerApiUrl,
  };
}

/**
 * Get default configuration for the store
 * 
 * @returns Default store configuration
 */
export function getDefaultStoreConfig(): StorageConfig {
  return resolveStoreConfig({});
} 