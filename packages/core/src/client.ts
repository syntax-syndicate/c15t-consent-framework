/**
 * @packageDocumentation
 * Client for interacting with the c15t consent management API.
 */

import type {
	ConsentBannerResponse,
	ConsentPurpose,
	FetchOptions,
	ResponseContext,
	c15tClientOptions,
} from './types';

let consentBannerRequestStatus: 'idle' | 'pending' | 'completed' = 'idle';
let consentBannerRequestPromise: Promise<
	ConsentBannerResponse | undefined
> | null = null;

/**
 * Default consent banner API URL
 */
const DEFAULT_API_BASE_URL = '/api/c15t';

/**
 * API endpoint paths
 */
const API_ENDPOINTS = {
	/**
	 * Path for the consent banner information endpoint
	 */
	SHOW_CONSENT_BANNER: '/show-consent-banner',

	/**
	 * Path for listing consent purposes
	 */
	LIST_PURPOSES: '/list-purposes',
};

/**
 * Client for interacting with the c15t consent management API.
 *
 * This class provides methods for retrieving and updating consent preferences,
 * listing consent purposes, and accessing consent history. It handles HTTP requests
 * to the c15t API and provides a type-safe interface for working with consent data.
 *
 * @remarks
 * The client abstracts away the details of making HTTP requests to the c15t API,
 * handling authentication, error handling, and response parsing. It provides
 * a clean, type-safe interface for working with consent data.
 *
 * @example
 * ```typescript
 * import { createConsentClient } from '@c15t/core';
 *
 * const client = createConsentClient({
 *   baseURL: 'https://example.com/api',
 *   headers: { 'X-API-Key': 'your-api-key' }
 * });
 *
 * // Get current consent
 * const { data, error } = await client.getConsent();
 *
 * // Update consent
 * await client.updateConsent({
 *   analytics: true,
 *   marketing: false
 * });
 * ```
 */
export class c15tClient {
	/**
	 * Base URL for API requests (without trailing slash)
	 *
	 * @internal
	 */
	private baseURL: string;

	/**
	 * Default headers to include with all requests
	 *
	 * @internal
	 */
	private headers: Record<string, string>;

	/**
	 * Custom fetch implementation (if provided)
	 *
	 * @internal
	 */
	private customFetch?: typeof fetch;

	/**
	 * Creates a new c15t client instance.
	 *
	 * @param options - Configuration options for the client
	 * @throws Will throw an error if the baseURL is invalid or if required options are missing
	 */
	constructor(options: c15tClientOptions) {
		this.baseURL = options.baseURL.endsWith('/')
			? options.baseURL.slice(0, -1)
			: options.baseURL;

		this.headers = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		this.customFetch = options.fetchOptions?.customFetchImpl;
	}

	/**
	 * Generic method for making HTTP requests to the API.
	 *
	 * This internal method handles constructing the request, processing the response,
	 * and executing any callbacks based on the response status. It provides standardized
	 * error handling and response formatting.
	 *
	 * @typeParam ResponseType - The expected type of the response data
	 * @param path - API endpoint path (will be appended to the baseURL)
	 * @param options - Request configuration options
	 * @returns A response context object containing the data, response metadata, and any errors
	 * @throws Will throw an error if options.throw is true and the request fails
	 * @internal This method is not intended to be used directly, use the public API methods instead
	 */
	private async fetcher<ResponseType>(
		path: string,
		options: FetchOptions<ResponseType> = {}
	): Promise<ResponseContext<ResponseType>> {
		try {
			const url = new URL(path, this.baseURL);

			// Add query parameters
			if (options.query) {
				for (const [key, value] of Object.entries(options.query)) {
					if (value !== undefined) {
						if (Array.isArray(value)) {
							for (const v of value) {
								url.searchParams.append(key, String(v));
							}
						} else {
							url.searchParams.append(key, String(value));
						}
					}
				}
			}

			const fetchOptions: RequestInit = {
				method: options.method || 'GET',
				headers: {
					...this.headers,
					...options.headers,
				},
			};

			// Add body for non-GET requests
			if (options.body && fetchOptions.method !== 'GET') {
				fetchOptions.body = JSON.stringify(options.body);
			}

			// Use custom fetch if provided, otherwise use global fetch
			const fetchImpl = this.customFetch || fetch;
			const response = await fetchImpl(url.toString(), fetchOptions);

			let data: ResponseType | null = null;
			let error: Error | null = null;

			// Parse response data
			if (response.status !== 204) {
				try {
					data = await response.json();
				} catch (err) {
					if (response.ok) {
						data = null;
					} else {
						error = new Error(
							`Failed to parse response: ${(err as Error).message}`
						);
					}
				}
			}

			// Create context object
			const context: ResponseContext<ResponseType> = {
				data,
				response,
				error: error
					? {
							message: error.message,
							status: response.status,
						}
					: null,
				ok: response.ok,
			};

			// Handle callbacks
			if (response.ok) {
				if (options.onSuccess) {
					await options.onSuccess(context);
				}
			} else {
				if (options.onError) {
					await options.onError(context);
				}

				// Throw error if requested
				if (options.throw) {
					const error = new Error(
						`Request failed with status ${response.status}`
					);
					Object.assign(error, { status: response.status, data });
					throw error;
				}
			}

			return context;
		} catch (error: unknown) {
			if (options.onError) {
				const errorObj = error as Error;
				const context: ResponseContext<ResponseType> = {
					data: null,
					error: {
						message: errorObj.message || 'Request failed',
						status: (error as { status?: number }).status || 500,
						code: (error as { code?: string }).code,
					},
					ok: false,
					response: null,
				};

				await options.onError(context);

				if (options.throw) {
					throw error;
				}

				return context;
			}

			if (options.throw) {
				throw error;
			}

			return {
				data: null,
				error: {
					message: (error as Error).message || 'Request failed',
					status: (error as { status?: number }).status || 500,
					code: (error as { code?: string }).code,
				},
				ok: false,
				response: null,
			};
		}
	}

	/**
	 * Lists all available consent purposes.
	 *
	 * This method retrieves all consent purposes configured in the system,
	 * including their IDs, names, descriptions, and whether they are required
	 * or optional.
	 *
	 * @throws Will throw an error if options.throw is true and the request fails
	 *
	 * @example
	 * ```typescript
	 * const { data, error } = await client.listPurposes();
	 *
	 * if (error) {
	 *   console.error('Failed to fetch purposes:', error.message);
	 *   return;
	 * }
	 *
	 * if (data) {
	 *   // Display available consent purposes to the subject
	 *   data.forEach(consentPurpose => {
	 *     console.log(`${consentPurpose.name}: ${consentPurpose.description}`);
	 *     console.log(`Required: ${consentPurpose.required}`);
	 *   });
	 * }
	 * ```
	 *
	 * @param options - Optional fetch configuration options
	 * @returns Response context containing the list of consent purposes if successful
	 */
	async listPurposes(
		options?: FetchOptions<ConsentPurpose[]>
	): Promise<ResponseContext<ConsentPurpose[]>> {
		return this.fetcher<ConsentPurpose[]>(API_ENDPOINTS.LIST_PURPOSES, {
			method: 'GET',
			...options,
		});
	}

	/**
	 * Makes a custom API request to any endpoint.
	 *
	 * This method allows for making requests to custom endpoints not covered
	 * by the standard methods, such as plugin-specific endpoints.
	 *
	 * @typeParam ResponseType - The expected type of the response data
	 * @param path - The API endpoint path
	 * @param options - Request configuration options
	 * @returns Response context containing the requested data if successful
	 * @throws Will throw an error if options.throw is true and the request fails
	 *
	 * @example
	 * ```typescript
	 * // Call a custom analytics endpoint with error handling
	 * try {
	 *   const { data, error } = await client.$fetch<AnalyticsResponse>('/analytics/track', {
	 *     method: 'POST',
	 *     body: {
	 *       event: 'page_view',
	 *       properties: { page: '/home' }
	 *     },
	 *     throw: true // Automatically throw on error
	 *   });
	 *
	 *   console.log('Event tracked successfully:', data);
	 * } catch (error) {
	 *   console.error('Failed to track event:', error);
	 * }
	 *
	 * // Using callbacks for success/error handling
	 * await client.$fetch('/analytics/track', {
	 *   method: 'POST',
	 *   body: { event: 'button_click' },
	 *   onSuccess: ({ data }) => console.log('Tracked:', data),
	 *   onError: ({ error }) => console.error('Failed:', error.message)
	 * });
	 * ```
	 */
	async $fetch<ResponseType>(
		path: string,
		options?: FetchOptions<ResponseType>
	): Promise<ResponseContext<ResponseType>> {
		return this.fetcher<ResponseType>(path, options);
	}

	/**
	 * Checks if a consent banner should be shown based on the user's location.
	 *
	 * This method determines whether a consent banner should be displayed
	 * based on the user's location and applicable privacy regulations.
	 *
	 * @example
	 * ```typescript
	 * const { data, error } = await client.showConsentBanner();
	 *
	 * if (data) {
	 *   if (data.showConsentBanner) {
	 *     console.log(`Banner required due to ${data.jurisdiction.code}: ${data.jurisdiction.message}`);
	 *     console.log(`User location: ${data.location.countryCode}`);
	 *     showConsentBanner();
	 *   } else {
	 *     console.log('No consent banner required in this jurisdiction');
	 *   }
	 * }
	 * ```
	 *
	 * @param options - Optional fetch configuration options
	 * @returns Response context containing the consent banner information if successful
	 */
	async showConsentBanner(
		options?: FetchOptions<ConsentBannerResponse>
	): Promise<ResponseContext<ConsentBannerResponse>> {
		return this.fetcher<ConsentBannerResponse>(
			API_ENDPOINTS.SHOW_CONSENT_BANNER,
			{
				method: 'GET',
				...options,
			}
		);
	}

	/**
	 * Checks if a consent banner should be shown with caching and deduplication.
	 *
	 * This method ensures that only one API request is made even if called multiple times,
	 * and provides callbacks for success and error handling.
	 *
	 * @param hasConsented - Function to check if user has already consented
	 * @param onSuccess - Callback function for successful fetch
	 * @param onError - Callback function for fetch errors
	 * @returns A promise resolving to the consent banner information or undefined if not needed
	 */
	async showConsentBannerWithCallbacks(
		hasConsented: () => boolean,
		onSuccess: (data: ConsentBannerResponse) => void,
		onError: (errorMessage: string) => void
	): Promise<ConsentBannerResponse | undefined> {
		// Skip if not in browser environment
		if (typeof window === 'undefined') {
			return undefined;
		}

		// Skip if user has already consented
		if (hasConsented()) {
			return undefined;
		}

		// If a request is already pending, return the existing promise
		if (
			consentBannerRequestStatus === 'pending' &&
			consentBannerRequestPromise
		) {
			return await consentBannerRequestPromise;
		}

		// If a request has already been completed, don't make another one
		if (consentBannerRequestStatus === 'completed') {
			return undefined;
		}

		// Set request status to pending
		consentBannerRequestStatus = 'pending';

		// Create the request promise
		consentBannerRequestPromise = (async () => {
			try {
				const { data, error } = await this.showConsentBanner();

				if (error) {
					throw new Error(
						`Failed to fetch consent banner info: ${error.message}`
					);
				}

				if (!data) {
					throw new Error('No data returned from consent banner API');
				}

				// Call success callback
				onSuccess(data);

				// Set request status to completed
				consentBannerRequestStatus = 'completed';

				return data;
			} catch (error) {
				console.error('Error fetching consent banner information:', error);

				// Call the onError callback
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Unknown error fetching consent banner information';
				onError(errorMessage);

				// Reset request status to idle so it can be tried again
				consentBannerRequestStatus = 'idle';
				consentBannerRequestPromise = null;

				throw error;
			}
		})();

		return await consentBannerRequestPromise;
	}

	/**
	 * Resets the consent banner request status.
	 * Useful for testing or forcing a new request.
	 */
	resetConsentBannerRequestStatus(): void {
		consentBannerRequestStatus = 'idle';
		consentBannerRequestPromise = null;
	}
}

/**
 * Creates and returns a new c15t client instance.
 *
 * This is the recommended way to create a client for interacting with the c15t API.
 * It provides a convenient factory function that instantiates a properly configured
 * client based on the provided options.
 *
 * @throws Will throw an error if the baseURL is invalid or if required options are missing
 *
 * @example
 * ```typescript
 * import { createConsentClient } from '@c15t/core';
 *
 * // Create a client for your application
 * const client = createConsentClient({
 *   baseURL: 'https://api.example.com/consent',
 *   headers: {
 *     'X-API-Key': process.env.API_KEY,
 *     'user-agent': 'MyConsentApp/1.0'
 *   },
 *   fetchOptions: {
 *     // Optional custom fetch implementation
 *     customFetchImpl: customFetch
 *   }
 * });
 * ```
 *
 * @param options - Configuration options for the client
 * @returns A new c15tClient instance
 */
export function createConsentClient(options: c15tClientOptions): c15tClient {
	// If no baseURL provided, use the default
	const clientOptions = {
		...options,
		baseURL: options.baseURL || DEFAULT_API_BASE_URL,
	};

	return new c15tClient(clientOptions);
}
