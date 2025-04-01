/**
 * @packageDocumentation
 * Provides a unified configuration system for c15t consent management.
 */

import type { c15tClient, c15tClientOptions } from './core/types';
import { resolveClientConfig } from './core';
import type { StorageConfig } from './store/types';
import { resolveStoreConfig } from './store';
import type { BackendConfig } from './backend/types';
import { resolveBackendConfig } from './backend';

/**
 * Unified configuration options for c15t consent management system
 * 
 * @remarks
 * This interface combines configurations for both the client API, 
 * the consent management store, and the backend services.
 */
export interface c15tConfig {
  /**
   * Configuration options for the c15t API client
   */
  client: c15tClientOptions;
  
  /**
   * Configuration options for the consent management store
   */
  store?: StorageConfig;
  
  /**
   * Configuration options for the backend services
   */
  backend?: BackendConfig;
}

/**
 * Return type for the createConsentManager function
 * Contains both the consent store and API client instances
 */
export interface ConsentManagerInstance {
  /**
   * The consent management store instance
   */
  store: Record<string, unknown>; // Type will depend on implementation

  /**
   * The c15t API client instance
   */
  client: c15tClient;
}

/**
 * Load the configuration from environment variables
 * 
 * @returns Loaded configuration with defaults
 */
export function loadConfig(): c15tConfig {
  // Implementation would use environment variables or config loading mechanism
  return {
    client: {
      baseURL: process.env.C15T_API_URL,
      token: process.env.C15T_API_TOKEN,
    },
  };
}

/**
 * Create a unified configuration for the entire c15t system
 * 
 * @param config - Partial configuration
 * @returns Fully resolved configuration
 */
export function createUnifiedConfig(
  config: Partial<c15tConfig> = {}
): c15tConfig {
  return {
    client: resolveClientConfig(config.client),
    store: config.store ? resolveStoreConfig(config.store) : undefined,
    backend: config.backend && 'secret' in config.backend && 'storage' in config.backend
      ? resolveBackendConfig(config.backend)
      : undefined,
  };
}