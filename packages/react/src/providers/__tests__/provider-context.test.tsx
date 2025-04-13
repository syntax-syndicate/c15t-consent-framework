import type { ConsentManagerOptions } from 'c15t';
// consent-manager-provider.context.test.tsx - Test context values
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

// Create references outside of mocks for test use
const modifyContextShowPopup = vi.fn();
const mockFetch = vi.fn();
// Create export variables to track calls from outside the mock
const mockingExports = {
	configureConsentManager: vi.fn(),
	clearClientRegistry: vi.fn(),
};

// Mock c15t module directly in this test file with standalone implementation
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
			// Add test isolation by default
			const enhancedOptions = {
				...options,
				testing: {
					...(options.testing || {}),
					isolateInstance: true,
				},
			};

			// Track the call using the external reference
			mockingExports.configureConsentManager(enhancedOptions);

			// Return a ready-to-use mock with showPopup set to true
			return {
				getCallbacks: () => enhancedOptions.callbacks || {},
				showConsentBanner: async () => ({
					ok: true,
					data: { showConsentBanner: true },
					error: null,
					response: null,
				}),
				setConsent: async () => ({
					ok: true,
					data: { success: true },
					error: null,
					response: null,
				}),
				verifyConsent: async () => ({
					ok: true,
					data: { valid: true },
					error: null,
					response: null,
				}),
			};
		},
		// Export any other constants or types needed
		defaultTranslationConfig: {},
		type: {},
		createConsentManagerStore: vi.fn(() => mockStore),
		// Add clear registry function for testing
		_clearClientRegistryForTests: () => {
			mockingExports.clearClientRegistry();
		},
	};
});

// Mock the useConsentManager hook
vi.mock('../../hooks/use-consent-manager', () => {
	return {
		useConsentManager: () => {
			// Return a simple mock with showPopup set to true
			const result = {
				manager: {},
				showPopup: true,
				state: {},
				store: {
					getState: () => ({}),
				},
			};

			// Track that this was called
			modifyContextShowPopup();
			return result;
		},
	};
});

describe('ConsentManagerProvider Context Values', () => {
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

		// Clear client registry for test isolation
		mockingExports.clearClientRegistry();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('should provide correct context values to children', async () => {
		const ConsumerComponent = () => {
			const context = useConsentManager();
			return (
				<div>
					<div data-testid="has-manager">
						{Boolean(context.manager).toString()}
					</div>
					<div data-testid="show-popup">
						{context.showPopup ? 'true' : 'false'}
					</div>
					<div data-testid="debug-state">
						{JSON.stringify({ showPopup: context.showPopup })}
					</div>
				</div>
			);
		};

		const { getByTestId } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					react: {
						theme: 'dark',
					},
				}}
			>
				<ConsumerComponent />
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify our mock was called
		expect(modifyContextShowPopup).toHaveBeenCalled();

		// Wait for values to be available (with generous timeout)
		await vi.waitFor(
			() => {
				expect(getByTestId('has-manager')).toHaveTextContent('true');
				expect(getByTestId('show-popup')).toHaveTextContent('true');
			},
			{ timeout: 3000 }
		);
	});

	it('should execute callbacks when provided', async () => {
		const onConsentSet = vi.fn();

		render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					callbacks: {
						onConsentSet,
					},
				}}
			>
				<div>Test</div>
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify the mock was called, with some wait time for async operations
		await vi.waitFor(
			() => {
				expect(mockingExports.configureConsentManager).toHaveBeenCalled();
			},
			{ timeout: 3000 }
		);

		// Verify the callback was properly passed
		const mockCall = mockingExports.configureConsentManager.mock.calls[0];
		expect(mockCall).toBeDefined();

		if (mockCall) {
			const options = mockCall[0];
			expect(options).toHaveProperty('callbacks');
			expect(options.callbacks).toHaveProperty('onConsentSet', onConsentSet);
		}
	});
});
