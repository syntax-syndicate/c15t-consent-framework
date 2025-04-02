/**
 * Backend configuration utilities for c15t consent management
 */

import type { BackendConfig } from './types';

export * from './types';

/**
 * Resolve backend configuration with defaults
 *
 * @param config - Partial backend configuration
 * @returns Fully resolved backend configuration
 */
export function resolveBackendConfig(
	config: Partial<BackendConfig> = {}
): BackendConfig {
	return {
		secret: config.secret || process.env.C15T_SECRET || '',
		baseURL: config.baseURL || process.env.C15T_BASE_URL,
		basePath: config.basePath || '/api/c15t',
		storage: config.storage,
		trustedOrigins: config.trustedOrigins || [],
		plugins: config.plugins || [],
	};
}

/**
 * Get default configuration for the backend
 *
 * @returns Default backend configuration
 */
export function getDefaultBackendConfig(
	config: Pick<BackendConfig, 'secret' | 'storage'>
): BackendConfig {
	return resolveBackendConfig(config);
}
