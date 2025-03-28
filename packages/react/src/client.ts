/**
 * @packageDocumentation
 * Re-exports the client functionality from core package for React applications.
 */

import {
	type c15tClient,
	type c15tClientOptions,
	createConsentClient as createCoreConsentClient,
} from 'c15t';

/**
 * Creates and returns a new c15t client instance.
 *
 * This is a convenience re-export of the core createConsentClient function,
 * allowing React applications to import it directly from '@c15t/react'.
 *
 * @param options - Configuration options for the client
 * @returns A new c15tClient instance
 *
 * @example
 * ```tsx
 * import { createConsentClient } from '@c15t/react';
 *
 * // Create a client for your React application
 * const client = createConsentClient({
 *   baseURL: '/api/c15t',
 *   headers: { 'X-API-Key': 'your-api-key' }
 * });
 *
 * // Use in your React component
 * function ConsentComponent() {
 *   useEffect(() => {
 *     client.showConsentBanner().then(({ data }) => {
 *       if (data?.showConsentBanner) {
 *         // Handle showing the banner
 *       }
 *     });
 *   }, []);
 *
 *   return <div>Consent Component</div>;
 * }
 * ```
 */
export function createConsentClient(options: c15tClientOptions): c15tClient {
	return createCoreConsentClient(options);
}

// Re-export the client type for convenience
export type { c15tClientOptions, c15tClient };
