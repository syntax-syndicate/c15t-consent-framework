import { createError, defineEventHandler } from 'h3';
import { z } from 'zod';
import validateBody from '~/pkgs/api-router/utils/validate-body';
import type { Consent } from '~/schema/consent';
import { PolicyTypeSchema } from '~/schema/consent-policy';
import type { ConsentRecord } from '~/schema/consent-record';
import type { Route } from './types';

const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: PolicyTypeSchema,
	metadata: z.record(z.unknown()).optional(),
});

// Cookie banner needs preferences
const cookieBannerSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.boolean()),
});

// Policy based consent just needs the policy ID
const policyBasedSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.boolean()).optional(),
});

// Other consent types just need the base fields
const otherConsentSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.boolean()).optional(),
});

const setConsentSchema = z.discriminatedUnion('type', [
	cookieBannerSchema,
	policyBasedSchema,
	otherConsentSchema,
]);

export interface SetConsentResponse {
	id: string;
	subjectId: string;
	externalSubjectId?: string;
	domainId: string;
	domain: string;
	type: z.infer<typeof PolicyTypeSchema>;
	status: string;
	recordId: string;
	metadata?: Record<string, unknown>;
	givenAt: string;
}

export const setConsent: Route = {
	path: '/consent/set',
	method: 'post',
	handler: defineEventHandler({
		handler: async (event) => {
			const body = await validateBody(event, setConsentSchema);

			const { registry, adapter } = event.context;
			const { type, subjectId, externalSubjectId, domain, metadata } = body;

			const subject = await registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: event.context.ipAddress || 'unknown',
			});

			if (!subject) {
				throw createError({
					statusCode: 400,
					statusMessage: 'Invalid subject ID',
				});
			}

			const domainRecord = await registry.findOrCreateDomain(domain);

			const now = new Date();
			let policyId: string | undefined;
			let purposeIds: string[] = [];

			if ('policyId' in body) {
				const { policyId: pid } = body;
				policyId = pid;

				if (!policyId) {
					throw createError({
						statusCode: 400,
						statusMessage:
							'A valid Policy ID is required to proceed with the consent operation. Please provide a Policy ID.',
					});
				}

				// Verify the policy exists and is active
				const policy = await registry.findConsentPolicyById(policyId);
				if (!policy) {
					throw createError({
						statusCode: 404,
						statusMessage:
							'The specified consent policy could not be found. Please verify the policy ID and try again.',
					});
				}
				if (!policy.isActive) {
					throw createError({
						statusCode: 409,
						statusMessage:
							'The consent policy is no longer active and cannot be used. Please use an active policy version.',
					});
				}
			} else {
				const policy = await registry.findOrCreatePolicy(type);
				if (!policy) {
					throw createError({
						statusCode: 500,
						statusMessage:
							'Failed to create or find the required policy. Please try again later or contact support if the issue persists.',
					});
				}
				policyId = policy.id;
			}

			// Handle purposes if they exist
			if ('preferences' in body && body.preferences) {
				purposeIds = await Promise.all(
					Object.entries(body.preferences)
						.filter(([_, isConsented]) => isConsented)
						.map(async ([purposeCode]) => {
							let existingPurpose =
								await registry.findConsentPurposeByCode(purposeCode);
							if (!existingPurpose) {
								existingPurpose = await registry.createConsentPurpose({
									code: purposeCode,
									name: purposeCode,
									description: `Auto-created consentPurpose for ${purposeCode}`,
									isActive: true,
									isEssential: false,
									dataCategory: 'functional',
									legalBasis: 'consent',
									createdAt: now,
									updatedAt: now,
								});
							}
							return existingPurpose.id;
						})
				);
			}

			const result = await adapter.transaction({
				callback: async (tx) => {
					// Create consent record
					const consentRecord = (await tx.create({
						model: 'consent',
						data: {
							subjectId: subject.id,
							domainId: domainRecord.id,
							policyId,
							purposeIds,
							status: 'active',
							isActive: true,
							givenAt: now,
							ipAddress: event.context.ipAddress || 'unknown',
							agent: event.context.userAgent || 'unknown',
							history: [],
						},
					})) as unknown as Consent;

					// Create record entry
					const record = (await tx.create({
						model: 'consentRecord',
						data: {
							subjectId: subject.id,
							consentId: consentRecord.id,
							actionType: 'consent_given',
							details: metadata,
							createdAt: now,
						},
					})) as unknown as ConsentRecord;

					// Create audit log entry
					await tx.create({
						model: 'auditLog',
						data: {
							subjectId: subject.id,
							entityType: 'consent',
							entityId: consentRecord.id,
							actionType: 'consent_given',
							details: {
								consentId: consentRecord.id,
								type,
							},
							timestamp: now,
							ipAddress: event.context.ipAddress || 'unknown',
							agent: event.context.userAgent || 'unknown',
						},
					});

					return {
						consent: consentRecord,
						record,
					};
				},
			});

			if (!result || !result.consent || !result.record) {
				throw createError({
					statusCode: 500,
					statusMessage:
						'Failed to create the consent record. Please try again later or contact support if the issue persists.',
				});
			}

			return {
				id: result.consent.id,
				subjectId: subject.id,
				externalSubjectId: subject.externalId ?? undefined,
				domainId: domainRecord.id,
				domain: domainRecord.name,
				type,
				status: result.consent.status,
				recordId: result.record.id,
				metadata,
				givenAt: result.consent.givenAt.toISOString(),
			};
		},
	}),
};
