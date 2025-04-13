import type { SetConsentResponse, VerifyConsentResponse } from '@c15t/backend';
import type {
	ConsentManagerInterface,
	ConsentManagerOptions,
	ResponseContext,
} from 'c15t';
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import { ConsentManagerProvider } from '../consent-manager-provider';

// Create a specific mock key for this test file to prevent conflicts
const MOCK_KEY = 'provider-callbacks-test';

// Mocks for this specific test file
const mockFetch = vi.fn();
const mockConfigureConsentManager = vi.fn();
const mockClearClientRegistry = vi.fn();
const triggerCallbacks = {
	onConsentSet: vi.fn(),
	onConsentVerified: vi.fn(),
};

// Mock c15t module with our test-specific implementation
vi.mock('c15t', () => {
	// Define a mock state interface for typing
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

	// Define a mock state
	const mockState: MockState = {
		consents: {},
		consentInfo: {},
		showPopup: true,
		isLoadingConsentInfo: false,
		gdprTypes: {},
		complianceSettings: {},
		// Add required methods to mock state
		setGdprTypes: vi.fn(),
		setComplianceSetting: vi.fn(),
		setDetectedCountry: vi.fn(),
	};

	// Mock store implementation
	const mockStore = {
		getState: () => mockState,
		setState: vi.fn(),
		subscribe: (listener: (state: MockState) => void) => {
			// Call listener immediately with initial state
			listener(mockState);
			// Return unsubscribe function
			return () => {};
		},
	};

	return {
		configureConsentManager: (options: ConsentManagerOptions) => {
			// Add test isolation by default in all tests
			const enhancedOptions = {
				...options,
				testing: {
					...(options.testing || {}),
					isolateInstance: true,
				},
			};
			// Track the configuration call
			mockConfigureConsentManager(enhancedOptions);

			// Store callbacks for testing
			const callbacks = enhancedOptions.callbacks || {};

			// Return a mock client that can trigger callbacks
			return {
				getCallbacks: () => callbacks,
				setCallbacks: (newCallbacks: Record<string, unknown>) => {
					Object.assign(callbacks, newCallbacks);
				},
				showConsentBanner: async () => ({
					ok: true,
					data: { showConsentBanner: true },
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

					// Call the onConsentSet callback if provided
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

					// Call the onConsentVerified callback if provided
					if (callbacks.onConsentVerified) {
						callbacks.onConsentVerified(responseContext);
						triggerCallbacks.onConsentVerified(responseContext);
					}
					return responseContext;
				},
				// Add the clear function for testing
				_clearRegistryForTests: () => {
					// Mock implementation that does nothing
					mockClearClientRegistry();
				},
			};
		},
		// Export the function to clear the registry for tests
		_clearClientRegistryForTests: () => {
			// Mock implementation
			mockClearClientRegistry();
		},
		// Export any other constants or utility functions used by the tests
		type: {},
		defaultTranslationConfig: {},
		createConsentManagerStore: vi.fn(() => mockStore),
	};
});

// Component with a ref to the ConsentManager
const ConsentActionsRef = ({
	onManagerReady,
}: {
	onManagerReady: (manager: ConsentManagerInterface) => void;
}) => {
	const consentManager = useConsentManager();

	// Call the callback when the manager is ready
	if (consentManager.manager) {
		onManagerReady(consentManager.manager);
	}

	return <div data-testid="actions-container">Actions Ready</div>;
};

describe('ConsentManagerProvider Callback Behavior', () => {
	// Setup before each test
	beforeEach(() => {
		// Clear all mocks
		vi.clearAllMocks();

		// Setup timers
		vi.useFakeTimers();

		// Setup fetch mock
		globalThis.fetch = mockFetch;
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		// Clear the registry mock
		mockClearClientRegistry();
	});

	// Cleanup after each test
	afterEach(() => {
		vi.useRealTimers();
	});

	// Global cleanup
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('should register callbacks during initialization', async () => {
		const onConsentSet = vi.fn();
		const onConsentVerified = vi.fn();

		render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet,
						onConsentVerified,
					},
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify the callbacks were registered
		expect(mockConfigureConsentManager).toHaveBeenCalledTimes(1);

		const options = mockConfigureConsentManager.mock.calls[0]?.[0];
		expect(options).toBeDefined();
		expect(options).toHaveProperty('callbacks');
		expect(options.callbacks).toHaveProperty('onConsentSet', onConsentSet);
		expect(options.callbacks).toHaveProperty(
			'onConsentVerified',
			onConsentVerified
		);
	});

	it('should execute onConsentSet callback when consent is set', async () => {
		const onConsentSet = vi.fn();
		const testData = { consents: { marketing: true, analytics: false } };
		let manager: ConsentManagerInterface | null = null;

		render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet,
					},
				}}
			>
				<ConsentActionsRef
					onManagerReady={(m) => {
						manager = m;
					}}
				/>
			</ConsentManagerProvider>
		);

		// Advance timers to allow initialization
		await vi.runAllTimersAsync();

		// Wait for the manager to be available
		expect(manager).not.toBeNull();

		// Call the setConsent method directly
		if (manager) {
			//@ts-expect-error
			await manager.setConsent({ body: testData });
		}

		// Verify the callback was called
		expect(onConsentSet).toHaveBeenCalledTimes(1);
		expect(onConsentSet).toHaveBeenCalledWith(
			expect.objectContaining({
				ok: true,
				data: expect.objectContaining({ success: true }),
			})
		);
		expect(triggerCallbacks.onConsentSet).toHaveBeenCalledTimes(1);
	});

	it('should execute onConsentVerified callback when consent is verified', async () => {
		const onConsentVerified = vi.fn();
		const testData = { type: 'marketing' };
		let manager: ConsentManagerInterface | null = null;

		render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentVerified,
					},
				}}
			>
				<ConsentActionsRef
					onManagerReady={(m) => {
						manager = m;
					}}
				/>
			</ConsentManagerProvider>
		);

		// Advance timers to allow initialization
		await vi.runAllTimersAsync();

		// Wait for the manager to be available
		expect(manager).not.toBeNull();

		// Call the verifyConsent method directly
		if (manager) {
			//@ts-expect-error
			await manager.verifyConsent({ body: testData });
		}

		// Verify the callback was called
		expect(onConsentVerified).toHaveBeenCalledTimes(1);
		expect(onConsentVerified).toHaveBeenCalledWith(
			expect.objectContaining({
				ok: true,
				data: expect.objectContaining({ isValid: true }),
			})
		);
		expect(triggerCallbacks.onConsentVerified).toHaveBeenCalledTimes(1);
	});

	it('should update callbacks when provider is rerendered with new callbacks', async () => {
		const initialCallback = vi.fn();
		const newCallback = vi.fn();
		const testData = { consents: { marketing: true } };
		let manager: ConsentManagerInterface | null = null;

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet: initialCallback,
					},
				}}
			>
				<ConsentActionsRef
					onManagerReady={(m) => {
						manager = m;
					}}
				/>
			</ConsentManagerProvider>
		);

		// Advance timers to allow initialization
		await vi.runAllTimersAsync();

		// Rerender with new callback
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet: newCallback,
					},
				}}
			>
				<ConsentActionsRef
					onManagerReady={(m) => {
						manager = m;
					}}
				/>
			</ConsentManagerProvider>
		);

		// Advance timers to allow re-initialization
		await vi.runAllTimersAsync();

		// Wait for the manager to be available
		expect(manager).not.toBeNull();

		// Call the setConsent method directly
		if (manager) {
			//@ts-expect-error
			await manager.setConsent({ body: testData });
		}

		// Verify the new callback was called, not the initial one
		expect(initialCallback).not.toHaveBeenCalled();
		expect(newCallback).toHaveBeenCalledTimes(1);
		expect(newCallback).toHaveBeenCalledWith(
			expect.objectContaining({
				ok: true,
				data: expect.objectContaining({ success: true }),
			})
		);
	});
});
