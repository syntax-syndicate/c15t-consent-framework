/**
 * Core configuration types for the c15t client
 */

/**
 * Client interface representing the c15t API client
 */
export interface c15tClient {
  // Core methods that will be implemented by the actual client
  [key: string]: unknown;
}

/**
 * Client options for connecting to the c15t API
 */
export interface c15tClientOptions {
  /**
   * Base URL for the API
   */
  baseURL?: string;
  
  /**
   * Optional headers to include with all requests
   */
  headers?: Record<string, string>;
  
  /**
   * Authentication token for the API
   */
  token?: string;
  
  /**
   * Timeout for API requests in milliseconds
   */
  timeout?: number;
} 