import { z } from 'zod';
import { defineRoute } from '~/pkgs/api-router';
import type {} from '~/pkgs/data-model';
import type { Adapter } from '~/pkgs/db-adapters/types';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { Consent } from '~/schema/consent';
import { PolicyTypeSchema } from '~/schema/consent-policy';
import type { ConsentRecord } from '~/schema/consent-record';

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

export const setConsent = defineRoute<
	SetConsentResponse,
	typeof setConsentSchema
>({
	path: '/consent/set',
	method: 'post',
	validations: {
		body: setConsentSchema,
	},
	handler: async (event) => {
		const { body } = event.context.validated;
		const { registry, adapter } = event.context;
		const { type, subjectId, externalSubjectId, domain, metadata } = body;

		const subject = await registry.findOrCreateSubject({
			subjectId,
			externalSubjectId,
			ipAddress: event.context.ipAddress || 'unknown',
		});

		if (!subject) {
			throw new DoubleTieError('Invalid subject ID', {
				code: ERROR_CODES.BAD_REQUEST,
				status: 400,
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
				throw new DoubleTieError('Policy ID is required', {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
				});
			}

			// Verify the policy exists and is active
			const policy = await registry.findConsentPolicyById(policyId);
			if (!policy) {
				throw new DoubleTieError('Policy not found', {
					code: ERROR_CODES.NOT_FOUND,
					status: 404,
				});
			}
			if (!policy.isActive) {
				throw new DoubleTieError('Policy is not active', {
					code: ERROR_CODES.CONFLICT,
					status: 409,
				});
			}
		} else {
			const policy = await registry.findOrCreatePolicy(type);
			if (!policy) {
				throw new DoubleTieError('Failed to create or find policy', {
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 500,
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
			callback: async (tx: Adapter) => {
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
			throw new DoubleTieError('Failed to create consent record', {
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				status: 500,
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
});
