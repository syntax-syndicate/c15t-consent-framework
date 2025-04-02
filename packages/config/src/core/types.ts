/**
 * Core configuration types for the c15t client
 */
import type { c15tClientPlugin } from '~/plugins/types';
import type { c15tClient } from './client';

/**
 * Client options for connecting to the c15t API
 */
export interface c15tClientOptions {
	/**
	 * Base URL for the API
	 */
	baseURL?: string;

	/**
	 * Optional headers to include with all requests
	 */
	headers?: Record<string, string>;

	/**
	 * Additional configuration options for the fetch implementation.
	 *
	 * These options control the behavior of the underlying HTTP client.
	 */
	fetchOptions?: {
		/**
		 * Custom fetch implementation to use instead of the global fetch.
		 *
		 * This can be useful for environments without a native fetch,
		 * or for using a fetch implementation with additional features.
		 *
		 * @example
		 * ```typescript
		 * import nodeFetch from 'node-fetch';
		 *
		 * const options = {
		 *   fetchOptions: {
		 *     customFetchImpl: nodeFetch
		 *   }
		 * };
		 * ```
		 */
		customFetchImpl?: typeof fetch;
	};

	/**
	 * Client plugins to extend the core client functionality.
	 *
	 * Plugins can add additional methods and features to the client,
	 * such as analytics tracking, geo-location services, etc.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   plugins: [
	 *     analyticsPlugin({
	 *       trackConsentChanges: true,
	 *       eventPrefix: 'consent_'
	 *     }),
	 *     geoPlugin({
	 *       defaultJurisdiction: 'us-ca',
	 *       cacheResults: true
	 *     })
	 *   ]
	 * };
	 * ```
	 */
	plugins?: c15tClientPlugin<c15tClient>[];
}
