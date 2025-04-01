/**
 * Backend configuration types for c15t consent management
 */

/**
 * Plugin for extending backend functionality
 */
export interface C15TPlugin {
  /**
   * Unique name for the plugin
   */
  name: string;
  
  /**
   * Plugin version
   */
  version?: string;
  
  /**
   * Plugin initialization function
   */
  setup?: (context: Record<string, unknown>) => Promise<void> | void;
}

/**
 * Configuration for c15t backend
 */
export interface BackendConfig {
  /**
   * Secret key for backend authentication
   */
  secret: string;
  
  /**
   * Base URL for the backend API
   */
  baseURL?: string;
  
  /**
   * Base path for the API
   * 
   * @default '/api/c15t'
   */
  basePath?: string;
  
  /**
   * Trusted origins that can access the API
   */
  trustedOrigins?: string[] | ((request: Request) => string[]);
  
  /**
   * Storage adapter configuration
   */
  storage: unknown; // Adapter-specific configuration
  
  /**
   * Plugins to extend functionality
   */
  plugins?: C15TPlugin[];
}

/**
 * Configuration options for the backend
 */
export interface C15TOptions<PluginTypes extends C15TPlugin[] = C15TPlugin[]> {
  /**
   * Secret key for backend authentication
   */
  secret: string;
  
  /**
   * Base URL for the backend API
   * If not provided, it will be derived from the request
   */
  baseURL?: string;
  
  /**
   * Base path for the API
   * 
   * @default '/api/c15t'
   */
  basePath?: string;
  
  /**
   * Trusted origins that can access the API
   */
  trustedOrigins?: string[] | ((request: Request) => string[]);
  
  /**
   * Storage adapter configuration
   */
  storage: unknown; // Adapter-specific configuration
  
  /**
   * Plugins to extend functionality
   * @template PluginTypes - Array of plugin types
   */
  plugins?: PluginTypes;
} 