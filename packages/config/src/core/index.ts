/**
 * Core configuration utilities for the c15t client
 */

import type { c15tClientOptions } from './types';

export * from './types';

/**
 * Resolve client configuration with defaults
 * 
 * @param config - Partial client configuration
 * @returns Fully resolved client configuration
 */
export function resolveClientConfig(
  config: Partial<c15tClientOptions> = {}
): c15tClientOptions {
  return {
    baseURL: config.baseURL || process.env.C15T_API_URL || 'https://api.c15t.com',
    token: config.token || process.env.C15T_API_TOKEN,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      ...config.headers,
    },
  };
}

/**
 * Get default configuration for the client
 * 
 * @returns Default client configuration
 */
export function getDefaultClientConfig(): c15tClientOptions {
  return resolveClientConfig({});
} 