/**
 * Shared types for the c15t configuration system
 */

/**
 * Repository providers supported by the system
 */
export type RepoProvider = 'github' | 'gitlab' | 'bitbucket';

/**
 * Compliance regions supported by the system
 */
export type ComplianceRegion = 'gdpr' | 'ccpa' | 'lgpd' | 'global';

/**
 * Configuration for the tracking blocker
 */
export interface TrackingBlockerConfig {
  /**
   * Whether the tracking blocker is enabled by default
   * 
   * @default false
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
} 