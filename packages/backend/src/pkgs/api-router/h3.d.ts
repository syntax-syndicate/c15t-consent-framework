/**
 * Type declarations for H3 framework extensions
 */

declare module 'h3' {
	interface H3EventContext {
		/**
		 * The IP address of the client making the request
		 * Can be null if IP tracking is disabled or IP cannot be determined
		 */
		ipAddress: string | null;

		/**
		 * The user agent string from the client's browser
		 */
		userAgent: string | null;
	}
}

// This export is required to make this a module
export {};
