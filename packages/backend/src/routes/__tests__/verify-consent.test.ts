import { beforeEach, describe, expect, it } from 'vitest';
import { c15tInstance } from '~/core';
import { memoryAdapter } from '~/pkgs/db-adapters';
import type { ConsentPolicy, PolicyType } from '~/schema';
import type { C15TContext } from '~/types';
import { setConsent } from '../set-consent';
import { verifyConsent } from '../verify-consent';

describe('Verify Consent Endpoint', () => {
	let context: C15TContext;

	beforeEach(async () => {
		const instance = await c15tInstance({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			trustedOrigins: ['http://localhost:3000'],
			secret: 'test-secret',
		});

		const contextResult = await instance.$context;
		if (!contextResult.isOk()) {
			throw new Error('Failed to initialize context');
		}
		context = contextResult.value;
	});

	// Helper function for creating consent data
	const createConsentData = (type: PolicyType, overrides = {}) => ({
		type,
		domain: 'example.com',
		preferences: {
			marketing: true,
			analytics: true,
		},
		...overrides,
	});

	// Helper function for creating verify data
	const createVerifyData = (type: PolicyType, overrides = {}) => ({
		type,
		domain: 'example.com',
		preferences: JSON.stringify(['marketing', 'analytics']),
		...overrides,
	});

	describe('verifyConsent', () => {
		describe('Cookie Banner Consent', () => {
			it('should verify existing cookie banner consent successfully', async () => {
				// First set consent
				const consentResponse = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('cookie_banner'),
				});

				// Then verify it
				const verifyResponse = await verifyConsent({
					context,
					params: undefined,
					query: undefined,
					body: createVerifyData('cookie_banner', {
						subjectId: consentResponse.subjectId,
					}),
				});

				expect(verifyResponse.isValid).toBe(true);
			});

			it('should fail verification when no preferences are provided for cookie banner', async () => {
				// First set consent
				const consentResponse = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('cookie_banner'),
				});

				// Then verify without preferences
				const verifyResponse = await verifyConsent({
					context,
					params: undefined,
					query: undefined,
					body: createVerifyData('cookie_banner', {
						subjectId: consentResponse.subjectId,
						preferences: '[]',
					}),
				});

				expect(verifyResponse.isValid).toBe(false);
				expect(verifyResponse.reasons).toContain('Preferences are required');
			});
		});

		describe('Privacy Policy Consent', () => {
			let policy: ConsentPolicy;

			beforeEach(async () => {
				policy = await context.registry.createConsentPolicy({
					type: 'privacy_policy',
					name: 'Test Privacy Policy',
					version: '1.0',
					content: 'Test content',
					contentHash: 'test-hash',
					effectiveDate: new Date(),
					updatedAt: new Date(),
					isActive: true,
				});
			});

			it('should verify consent with explicit policy ID', async () => {
				// First set consent with policy ID
				const consentResponse = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', { policyId: policy.id }),
				});

				// Then verify it with same policy ID
				const verifyResponse = await verifyConsent({
					context,
					params: undefined,
					query: undefined,
					body: createVerifyData('privacy_policy', {
						subjectId: consentResponse.subjectId,
						policyId: policy.id,
					}),
				});

				expect(verifyResponse.isValid).toBe(true);
			});

			it('should verify consent against latest policy when policyId not provided', async () => {
				// First set consent with policy ID
				const consentResponse = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', { policyId: policy.id }),
				});

				// Then verify it without specifying policy ID (should use latest)
				const verifyResponse = await verifyConsent({
					context,
					params: undefined,
					query: undefined,
					body: createVerifyData('privacy_policy', {
						subjectId: consentResponse.subjectId,
					}),
				});

				expect(verifyResponse.isValid).toBe(true);
			});

			it('should fail verification with invalid policy ID', async () => {
				// First set consent with policy ID
				const consentResponse = await setConsent({
					context,
					params: undefined,
					query: undefined,
					body: createConsentData('privacy_policy', { policyId: policy.id }),
				});

				// Then verify with wrong policy ID
				const verifyResponse = await verifyConsent({
					context,
					params: undefined,
					query: undefined,
					body: createVerifyData('privacy_policy', {
						subjectId: consentResponse.subjectId,
						policyId: 'invalid-policy-id',
					}),
				});

				expect(verifyResponse.isValid).toBe(false);
				expect(verifyResponse.reasons).toContain('Policy not found');
			});
		});
	});
});
