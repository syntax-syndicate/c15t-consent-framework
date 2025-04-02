/**
 * Client plugin interface for extending the c15t client functionality.
 *
 * Plugins can add additional methods and features to the client,
 * such as analytics tracking, geo-location services, etc.
 *
 * @example
 * ```typescript
 * // Defining a custom plugin
 * const analyticsPlugin = (options = {}): c15tClientPlugin => ({
 *   id: 'analytics',
 *
 *   init: (client) => {
 *     console.log('Analytics plugin initialized');
 *   },
 *
 *   methods: {
 *     trackEvent: async (eventName, properties) => {
 *       // Implementation logic
 *       return { success: true };
 *     },
 *
 *     getAnalyticsConsent: async () => {
 *       // Get analytics-specific consent
 *       return { allowed: true };
 *     }
 *   }
 * });
 *
 * // Using the plugin
 * const client = createConsentClient({
 *   baseURL: 'https://api.example.com',
 *   plugins: [analyticsPlugin({ trackPageviews: true })]
 * });
 *
 * // Now you can use the plugin methods
 * client.trackEvent('button_click', { buttonId: 'submit' });
 * ```
 */
export interface c15tClientPlugin<IClient> {
	/**
	 * Unique plugin identifier.
	 *
	 * This ID should be unique across all plugins to avoid conflicts.
	 */
	id: string;

	/**
	 * Plugin initialization function.
	 *
	 * This function is called when the plugin is registered with the client.
	 * It can be used to set up the plugin and perform any necessary initialization.
	 *
	 * @param client The c15t client instance this plugin is being initialized with
	 */
	init?: (client: IClient) => void;

	/**
	 * Extensions to client methods.
	 *
	 * These methods will be added to the client instance, allowing plugins
	 * to extend the client's functionality with additional methods.
	 */
	methods?: Record<string, (...args: unknown[]) => unknown>;

	/**
	 * Type inference for the server-side plugin implementation.
	 *
	 * This is used for type checking to ensure the client plugin is compatible
	 * with the server-side plugin implementation.
	 *
	 * @internal This property is primarily for TypeScript type checking
	 */
	$InferServerPlugin?: Record<string, unknown>;
}
