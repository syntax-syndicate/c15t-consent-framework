import type {
	SetConsentRequestBody,
	SetConsentResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';
import type {
	ConsentManagerInterface,
	ConsentManagerOptions,
	ResponseContext,
} from 'c15t';
import * as React from 'react';
import { beforeEach, vi } from 'vitest';
import { useConsentManager } from '../../hooks/use-consent-manager';

// Create mock references that can be accessed by tests
const mockFetch = vi.fn();
const mockConfigureConsentManager = vi.fn();
const mockClearClientRegistry = vi.fn();
const triggerCallbacks = {
	onConsentSet: vi.fn(),
	onConsentVerified: vi.fn(),
};

// Track fetch calls to avoid duplicates - use a global map to persist between test runs
const fetchCallMap = new Map<string, boolean>();

// Interface for mock state to ensure type safety
interface MockState {
	consents: Record<string, unknown>;
	consentInfo: Record<string, unknown>;
	showPopup: boolean;
	isLoadingConsentInfo: boolean;
	gdprTypes: Record<string, unknown>;
	complianceSettings: Record<string, unknown>;
	setGdprTypes: (types: unknown) => void;
	setComplianceSetting: (region: string, settings: unknown) => void;
	setDetectedCountry: (country: string) => void;
}

// Default mock state
const createMockState = (): MockState => ({
	consents: {},
	consentInfo: {},
	showPopup: true,
	isLoadingConsentInfo: false,
	gdprTypes: {},
	complianceSettings: {},
	setGdprTypes: vi.fn(),
	setComplianceSetting: vi.fn(),
	setDetectedCountry: vi.fn(),
});

// Create a store with the mock state
const createMockStore = (initialState = createMockState()) => {
	let state = initialState;
	return {
		getState: () => state,
		setState: vi.fn((newState) => {
			state = { ...state, ...newState };
		}),
		subscribe: (listener: (state: MockState) => void) => {
			// Call listener immediately with initial state
			listener(state);
			// Return unsubscribe function
			return () => {};
		},
	};
};

/**
 * Setup mocks for c15t tests
 *
 * @param options - Options to customize the mock behavior
 * @returns Mocked functions and utilities for testing
 */
export function setupMocks(options = { errorMode: false }) {
	// Reset fetch tracking between tests
	beforeEach(() => {
		fetchCallMap.clear();
		mockFetch.mockClear();
		mockConfigureConsentManager.mockClear();
		mockClearClientRegistry.mockClear();
		triggerCallbacks.onConsentSet.mockClear();
		triggerCallbacks.onConsentVerified.mockClear();
		
		// For testing, prevent C15tClient from calling the actual fetch
		vi.stubGlobal('fetch', mockFetch);
	});

	// Setup default success response
	if (options.errorMode) {
		// Setup error response if errorMode is true
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ error: 'API error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			})
		);
	} else {
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
	}

	// Mock c15t module
	vi.mock('c15t', async () => {
		const originalModule = await vi.importActual('c15t');
		// Create mock store for state
		const mockStore = createMockStore();

		return {
			...(originalModule as object),
			configureConsentManager: (clientOptions: ConsentManagerOptions) => {
				// Add test isolation by default
				const enhancedOptions = {
					...clientOptions,
					testing: {
						...(clientOptions.testing || {}),
						isolateInstance: true,
					},
				};
				
				// Track the configuration call
				mockConfigureConsentManager(enhancedOptions);
				
				const callbacks = enhancedOptions.callbacks || {};
				const backendURL = enhancedOptions.backendURL || '';
                
                // Create a unique key for this backend URL
                const urlKey = `${enhancedOptions.mode}-${backendURL}`;

				// Create client according to the mode
				if (options.errorMode) {
					// Return error responses
					return {
						getCallbacks: () => callbacks,
						setCallbacks: (newCallbacks: Record<string, unknown>) => {
							Object.assign(callbacks, newCallbacks);
						},
						showConsentBanner: async () => ({
							ok: false,
							data: null,
							error: { 
                                message: 'API error',
                                status: 500,
                                code: 'INTERNAL_ERROR' 
                            },
							response: new Response(JSON.stringify({ error: 'API error' }), {
								status: 500,
								headers: { 'Content-Type': 'application/json' }
							}),
						}),
						setConsent: async () => {
							const responseContext: ResponseContext<SetConsentResponse> = {
								ok: false,
								data: null,
								error: { 
                                    message: 'API error',
                                    status: 500,
                                    code: 'INTERNAL_ERROR'
                                },
								response: new Response(JSON.stringify({ error: 'API error' }), {
									status: 500,
									headers: { 'Content-Type': 'application/json' }
								}),
							};
							
							if (callbacks.onConsentSet) {
								callbacks.onConsentSet(responseContext);
								triggerCallbacks.onConsentSet(responseContext);
							}
							return responseContext;
						},
						verifyConsent: async () => {
							const responseContext: ResponseContext<VerifyConsentResponse> = {
								ok: false,
								data: null,
								error: { 
                                    message: 'API error',
                                    status: 500,
                                    code: 'INTERNAL_ERROR'
                                },
								response: new Response(JSON.stringify({ error: 'API error' }), {
									status: 500,
									headers: { 'Content-Type': 'application/json' }
								}),
							};
							
							if (callbacks.onConsentVerified) {
								callbacks.onConsentVerified(responseContext);
								triggerCallbacks.onConsentVerified(responseContext);
							}
							return responseContext;
						},
						_clearRegistryForTests: mockClearClientRegistry,
					};
				}
				
				// For offline mode - NEVER make fetch calls
				if (enhancedOptions.mode === 'offline') {
					return {
						getCallbacks: () => callbacks,
						setCallbacks: (newCallbacks: Record<string, unknown>) => {
							Object.assign(callbacks, newCallbacks);
						},
						showConsentBanner: async () => ({
							ok: true,
							data: { 
								showConsentBanner: true,
								jurisdiction: {
									code: 'EU',
									message: 'EU',
								},
								location: { countryCode: 'US', regionCode: 'CA' },
							},
							error: null,
							response: null,
						}),
						setConsent: async () => {
							const responseContext: ResponseContext<SetConsentResponse> = {
								ok: true,
								data: {
									id: '123',
									subjectId: '456',
									externalSubjectId: 'ext-123',
									domainId: '789',
									domain: 'example.com',
									type: 'cookie_banner',
									status: 'active',
									recordId: '101',
									givenAt: new Date().toISOString(),
									metadata: {},
									success: true,
								} as SetConsentResponse,
								error: null,
								response: null,
							};
							
							if (callbacks.onConsentSet) {
								callbacks.onConsentSet(responseContext);
								triggerCallbacks.onConsentSet(responseContext);
							}
							return responseContext;
						},
						verifyConsent: async () => {
							const responseContext: ResponseContext<VerifyConsentResponse> = {
								ok: true,
								data: {
									isValid: true,
									consent: {
										id: '123',
										subjectId: '456',
										domainId: '789',
										status: 'active',
										purposeIds: [],
										isActive: true,
										givenAt: new Date(),
										history: [],
									},
								},
								error: null,
								response: null,
							};
							
							if (callbacks.onConsentVerified) {
								callbacks.onConsentVerified(responseContext);
								triggerCallbacks.onConsentVerified(responseContext);
							}
							return responseContext;
						},
						_clearRegistryForTests: mockClearClientRegistry,
						// Important: Add this property to prevent fetch calls in offlineFallback
                        disableFallback: true,
					};
				}
				
				// Default client with success responses for c15t mode
				return {
					getCallbacks: () => callbacks,
					setCallbacks: (newCallbacks: Record<string, unknown>) => {
						Object.assign(callbacks, newCallbacks);
					},
					showConsentBanner: async () => {
						// Make fetch call for c15t mode if not already made for this specific URL
						if (!fetchCallMap.has(urlKey)) {
							mockFetch(`${backendURL}/show-consent-banner`, {
								headers: { 'Content-Type': 'application/json' }
							});
							// Mark this specific URL as called to prevent duplicates
							fetchCallMap.set(urlKey, true);
						}
						
						return {
							ok: true,
							data: { showConsentBanner: true },
							error: null,
							response: null,
						};
					},
					setConsent: async (data?: SetConsentRequestBody) => {
						const responseContext: ResponseContext<SetConsentResponse> = {
							ok: true,
							data: {
								id: '123',
								subjectId: '456',
								externalSubjectId: 'ext-123',
								domainId: '789',
								domain: 'example.com',
								type: 'cookie_banner',
								status: 'active',
								recordId: '101',
								givenAt: new Date().toISOString(),
								metadata: {},
								success: true,
							} as SetConsentResponse,
							error: null,
							response: null,
						};
						
						if (callbacks.onConsentSet) {
							callbacks.onConsentSet(responseContext);
							triggerCallbacks.onConsentSet(responseContext);
						}
						return responseContext;
					},
					verifyConsent: async (data?: VerifyConsentRequestBody) => {
						const responseContext: ResponseContext<VerifyConsentResponse> = {
							ok: true,
							data: {
								isValid: true,
								consent: {
									id: '123',
									subjectId: '456',
									domainId: '789',
									status: 'active',
									purposeIds: [],
									isActive: true,
									givenAt: new Date(),
									history: [],
								},
							},
							error: null,
							response: null,
						};
						
						if (callbacks.onConsentVerified) {
							callbacks.onConsentVerified(responseContext);
							triggerCallbacks.onConsentVerified(responseContext);
						}
						return responseContext;
					},
					_clearRegistryForTests: mockClearClientRegistry,
                    // Disable the fallback mechanism to prevent additional fetch calls
                    disableFallback: true,
				};
			},
			// Export utilities for tests
			createConsentManagerStore: vi.fn(() => mockStore),
			_clearClientRegistryForTests: mockClearClientRegistry,
			// Additional exports for consistent testing
			defaultTranslationConfig: {},
			type: {},
		};
	});

	return { 
		mockFetch, 
		mockConfigureConsentManager, 
		mockClearClientRegistry, 
		triggerCallbacks 
	};
}

/**
 * Test component with access to consent manager
 */
export const TestConsumer = ({ onManagerReady }: { onManagerReady?: (manager: ConsentManagerInterface) => void }) => {
	const consentManager = useConsentManager();
	
	// Call the callback when the manager is ready
	if (onManagerReady && consentManager.manager) {
		onManagerReady(consentManager.manager);
	}
	
	return React.createElement("div", { "data-testid": "consumer" }, [
		React.createElement("div", { "data-testid": "show-popup", key: "popup" }, consentManager.showPopup ? 'Show' : 'Hide'),
		React.createElement("div", { "data-testid": "has-manager", key: "manager" }, Boolean(consentManager.manager).toString())
	]);
};
