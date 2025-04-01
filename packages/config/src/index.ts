/**
 * @packageDocumentation
 * Provides a unified configuration system for c15t.
 */

// Re-export essential types from types module
export type {
  RepoProvider,
  ComplianceRegion,
  TrackingBlockerConfig
} from './types';

// Re-export core module
export type {
  c15tClient,
  c15tClientOptions
} from './core/types';
export {
  resolveClientConfig,
  getDefaultClientConfig
} from './core';

// Re-export store module
export type {
  StoreConfig,
  StorageConfig
} from './store/types';
export {
  resolveStoreConfig,
  getDefaultStoreConfig
} from './store';

// Re-export backend module
export type {
  C15TPlugin,
  BackendConfig,
  C15TOptions
} from './backend/types';
export {
  resolveBackendConfig,
  getDefaultBackendConfig
} from './backend';

// Re-export unified config
export type {
  c15tConfig,
  ConsentManagerInstance
} from './config';
export {
  loadConfig,
  createUnifiedConfig
} from './config';
