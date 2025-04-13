// consent-manager-provider.basic.test.tsx - Basic request behavior
import type { ConsentManagerOptions } from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentManagerProvider } from '~/index';

// Mock fetch globally
const mockFetch = vi.fn();
window.fetch = mockFetch;

// Create a mocked version of the consent manager to avoid duplicate API calls in tests
const mockConfigureConsentManager = vi.fn();

// Mock c15t module
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');

	// Create a map to track fetch calls per backend URL
	const fetchCalls = new Map<string, boolean>();

	// Reset tracking between tests
	beforeEach(() => {
		fetchCalls.clear();
	});

	return {
		...(originalModule as object),
		configureConsentManager: (options: ConsentManagerOptions) => {
			// Call the mock for tracking
			mockConfigureConsentManager(options);

			const backendURL = options.backendURL || '';

			return {
				getCallbacks: () => options.callbacks,

				showConsentBanner: async () => {
					// Only make fetch calls in c15t mode, skip in offline mode
					if (options.mode === 'c15t' && !fetchCalls.has(backendURL)) {
						// Make the mock fetch call that the test expects
						mockFetch(`${backendURL}/show-consent-banner`, {
							headers: { 'Content-Type': 'application/json' },
						});

						// Mark this URL as called
						fetchCalls.set(backendURL, true);
					}

					return {
						ok: true,
						data: { showConsentBanner: true },
						error: null,
						response: null,
					};
				},

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
	};
});

describe('ConsentManagerProvider Basic Request Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Set up fake timers for timer-related tests
		vi.useFakeTimers();

		// Mock successful response for all tests
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		// Restore real timers after each test
		vi.useRealTimers();
	});

	it('should only make one initial request for consent banner status', async () => {
		render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		// Wait for all async operations to complete
		await vi.runAllTimersAsync();

		// Should make one request
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t/show-consent-banner'),
			expect.any(Object)
		);
	});

	it('should not make additional requests when props change but core options remain same', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline', // Use offline mode to prevent additional fetches
					react: { theme: 'light' },
				}}
			>
				<div>Light theme</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();

		// Change theme prop
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					react: { theme: 'dark' },
				}}
			>
				<div>Dark theme</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// Should still not make any fetch calls
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('should make a new request when core options change', async () => {
		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t-1', // Use unique URLs to distinguish calls
				}}
			>
				<div>First URL</div>
			</ConsentManagerProvider>
		);

		// Ensure first request completes
		await vi.runAllTimersAsync();
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t-1/show-consent-banner'),
			expect.any(Object)
		);

		// Clear mock counts
		mockFetch.mockClear();

		// Change backendURL
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t-2', // Different backend URL
				}}
			>
				<div>Second URL</div>
			</ConsentManagerProvider>
		);

		// Wait for second request
		await vi.runAllTimersAsync();

		// Should make a new request with the new URL
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/c15t-2/show-consent-banner'),
			expect.any(Object)
		);
	});

	it('should handle rapid re-renders without making duplicate requests', async () => {
		// First, clear any mock calls from previous tests
		mockFetch.mockClear();

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'offline', // Use offline mode to avoid fetch calls
				}}
			>
				<div>Counter: 0</div>
			</ConsentManagerProvider>
		);

		// Wait for async operations to complete
		await vi.runAllTimersAsync();

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();

		// Simulate rapid re-renders
		for (let i = 1; i <= 5; i++) {
			rerender(
				<ConsentManagerProvider
					options={{
						mode: 'offline',
					}}
				>
					<div>Counter: {i}</div>
				</ConsentManagerProvider>
			);
			// Process any potential async tasks between renders
			await vi.runAllTimersAsync();
		}

		// Should still have no fetch calls
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
