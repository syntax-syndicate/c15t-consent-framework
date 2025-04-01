/**
 * Storage configuration types for c15t consent management
 */

import type { TrackingBlockerConfig } from '../types';

/**
 * Configuration for storage and persistence
 */
export interface StoreConfig {
  /**
   * Configuration for the tracking blocker
   */
  trackingBlockerConfig?: {
    /**
     * Whether the tracking blocker is enabled by default
     */
    enabledByDefault?: boolean;
    
    /**
     * List of domains to block
     */
    blockedDomains?: string[];
    
    /**
     * List of domains to allow
     */
    allowedDomains?: string[];
  };
}

/**
 * Configuration options for the consent management store
 */
export interface StorageConfig {
  /**
   * Optional namespace for the store instance
   * 
   * @default 'c15tStore'
   */
  namespace?: string;
  
  /**
   * Configuration for the tracking blocker
   */
  trackingBlockerConfig?: TrackingBlockerConfig;
  
  /**
   * URL to fetch consent banner information from
   */
  consentBannerApiUrl?: string;
} 