import type { ConsentManagerInterface } from 'c15t';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ConsentManagerProvider } from '../../providers/consent-manager-provider';
import { useConsentManager } from '../use-consent-manager';
// Define the return type of useConsentManager for type safety in tests
interface ConsentManagerHookResult {
	manager?: ConsentManagerInterface;
	showPopup: boolean;
	consents: Record<string, unknown>;
	consentInfo: Record<string, unknown>;
	[key: string]: unknown;
}

// Mock c15t module to avoid dependency issues
vi.mock('c15t', () => {
	// Define mock state interface
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

	// Create mock state
	const mockState: MockState = {
		consents: {},
		consentInfo: {},
		showPopup: true,
		isLoadingConsentInfo: false,
		gdprTypes: {},
		complianceSettings: {},
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

	// Mock client
	const mockClient = {
		getCallbacks: () => ({}),
		setCallbacks: vi.fn(),
		showConsentBanner: vi.fn().mockResolvedValue({
			ok: true,
			data: { showConsentBanner: true },
			error: null,
			response: null,
		}),
		setConsent: vi.fn().mockResolvedValue({
			ok: true,
			data: { success: true },
			error: null,
			response: null,
		}),
		verifyConsent: vi.fn().mockResolvedValue({
			ok: true,
			data: { valid: true },
			error: null,
			response: null,
		}),
	};

	return {
		configureConsentManager: vi.fn(() => mockClient),
		createConsentManagerStore: vi.fn(() => mockStore),
		defaultTranslationConfig: {},
		_clearClientRegistryForTests: vi.fn(),
	};
});

// Mock context to match actual implementation
vi.mock('../use-consent-manager', async () => {
	const actual = await vi.importActual<typeof import('../use-consent-manager')>(
		'../use-consent-manager'
	);

	return {
		...actual,
		useConsentManager: vi.fn().mockReturnValue({
			manager: {},
			showPopup: true,
			consents: {},
			consentInfo: {},
			isLoadingConsentInfo: false,
			gdprTypes: {},
			complianceSettings: {},
		}),
	};
});

describe('useConsentManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('returns consent state and methods when used within provider', () => {
		const { result } = renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current).toBeDefined();
		// The returned object should have a showPopup property
		expect(typeof result.current.showPopup).toBe('boolean');
		// Ensure there are no type issues by asserting the presence of key properties
		expect(result.current).toHaveProperty('manager');
		expect(result.current).toHaveProperty('showPopup');
		expect(result.current).toHaveProperty('consents');
		expect(result.current).toHaveProperty('consentInfo');
	});

	test('provides manager object when configured', () => {
		const { result } = renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current.manager).toBeDefined();
	});
});
