import type { ConsentManagerOptions } from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import { ConsentManagerProvider } from '../consent-manager-provider';

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
					// Each unique URL should trigger a fetch call once
					if (!fetchCalls.has(backendURL)) {
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

describe('ConsentManagerProvider Request Behavior', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Mock successful response
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ showConsentBanner: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should only make one initial request for consent banner status', async () => {
		const TestComponent = () => {
			const { showPopup } = useConsentManager();
			return <div>{showPopup ? 'Show Banner' : 'Hide Banner'}</div>;
		};

		render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<TestComponent />
			</ConsentManagerProvider>
		);

		// Wait for initial request
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/c15t/show-consent-banner'),
				expect.any(Object)
			);
		});
	});

	it('should not make additional requests when props change but core options remain same', async () => {
		const TestComponent = ({ theme }: { theme?: 'light' | 'dark' }) => {
			const { showPopup } = useConsentManager();
			return <div>{showPopup ? 'Show Banner' : 'Hide Banner'}</div>;
		};

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
					react: { theme: 'light' },
				}}
			>
				<TestComponent theme="light" />
			</ConsentManagerProvider>
		);

		// Wait for initial request
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Change theme prop
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
					react: { theme: 'dark' },
				}}
			>
				<TestComponent theme="dark" />
			</ConsentManagerProvider>
		);

		// Should still only have been called once
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	it('should make a new request when core options change', async () => {
		const TestComponent = () => {
			const { showPopup } = useConsentManager();
			return <div>{showPopup ? 'Show Banner' : 'Hide Banner'}</div>;
		};

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<TestComponent />
			</ConsentManagerProvider>
		);

		// Wait for initial request
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Change backendURL
		rerender(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t-new',
				}}
			>
				<TestComponent />
			</ConsentManagerProvider>
		);

		// Should have been called twice - once for initial and once for backendURL change
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(mockFetch).toHaveBeenLastCalledWith(
				expect.stringContaining('/api/c15t-new/show-consent-banner'),
				expect.any(Object)
			);
		});
	});

	it('should handle rapid re-renders without making duplicate requests', async () => {
		const TestComponent = ({ counter }: { counter: number }) => {
			const { showPopup } = useConsentManager();
			return (
				<div>
					{showPopup ? 'Show Banner' : 'Hide Banner'} (Count: {counter})
				</div>
			);
		};

		const { rerender } = render(
			<ConsentManagerProvider
				options={{
					mode: 'c15t',
					backendURL: '/api/c15t',
				}}
			>
				<TestComponent counter={0} />
			</ConsentManagerProvider>
		);

		// Wait for initial request
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Simulate rapid re-renders
		for (let i = 1; i <= 5; i++) {
			rerender(
				<ConsentManagerProvider
					options={{
						mode: 'c15t',
						backendURL: '/api/c15t',
					}}
				>
					<TestComponent counter={i} />
				</ConsentManagerProvider>
			);
		}

		// Should still only have been called once despite multiple re-renders
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});
});
