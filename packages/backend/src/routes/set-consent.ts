import { ORPCError, } from '@orpc/server';
import { z } from 'zod';
import { pub } from './index';
import { } from '~/pkgs/results';
import { createLogger } from '~/pkgs/logger';
import { PolicyTypeSchema } from '~/schema/consent-policy';

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

export const SetConsentSchema = z.discriminatedUnion('type', [
	cookieBannerSchema,
	policyBasedSchema,
	otherConsentSchema,
]);

export const setConsentHandler = pub
	.route({
		path: '/consent/set',
		method: 'POST',
	})
	.input(SetConsentSchema)
	.output(
		z.object({
			id: z.string(),
			subjectId: z.string(),
			externalSubjectId: z.string().optional(),
			domainId: z.string(),
			domain: z.string(),
			type: PolicyTypeSchema,
			status: z.string(),
			recordId: z.string(),
			metadata: z.record(z.unknown()).optional(),
			givenAt: z.string(),
		})
	)
	.handler(async ({ input, context }) => {
		// Ensure we have a logger (should already be in context, but add as a fallback)
		const logger = context.logger || createLogger();
		logger.info('Handling set-consent request');

		const { type, subjectId, externalSubjectId, domain, metadata } = input;

		logger.debug('Request parameters', {
			type,
			subjectId,
			externalSubjectId,
			domain,
		});

		try {
			const subject = await context.registry.findOrCreateSubject({
				subjectId,
				externalSubjectId,
				ipAddress: context.ipAddress || 'unknown',
			});

			if (!subject) {
				const errMsg = 'Subject not found or could not be created';
				logger.error(errMsg, { subjectId, externalSubjectId });
				throw new ORPCError('BAD_REQUEST', errMsg);
			}

			logger.debug('Subject found/created', { subjectId: subject.id });
			const domainRecord = await context.registry.findOrCreateDomain(domain);

			const now = new Date();
			let policyId: string | undefined;
			let purposeIds: string[] = [];

			if ('policyId' in input) {
				const { policyId: pid } = input;
				policyId = pid;

				if (!policyId) {
					throw new ORPCError('BAD_REQUEST', 'Policy ID is required');
				}

				// Verify the policy exists and is active
				const policy = await context.registry.findConsentPolicyById(policyId);
				if (!policy) {
					throw new ORPCError('NOT_FOUND', 'Policy not found');
				}
				if (!policy.isActive) {
					throw new ORPCError('CONFLICT', 'Policy is not active');
				}
			} else {
				const policy = await context.registry.findOrCreatePolicy(type);
				if (!policy) {
					throw new ORPCError('INTERNAL_SERVER_ERROR', 'Failed to create or find policy');
				}
				policyId = policy.id;
			}

			// Handle purposes if they exist
			if ('preferences' in input && input.preferences) {
				purposeIds = await Promise.all(
					Object.entries(input.preferences)
						.filter(([_, isConsented]) => isConsented)
						.map(async ([purposeCode]) => {
							let existingPurpose =
								await context.registry.findConsentPurposeByCode(purposeCode);
							if (!existingPurpose) {
								existingPurpose = await context.registry.createConsentPurpose({
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

			const result = await context.adapter.transaction({
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
							ipAddress: context.ipAddress || 'unknown',
							agent: context.userAgent || 'unknown',
							history: [],
						},
					}));

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
					}));

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
							ipAddress: context.ipAddress || 'unknown',
							agent: context.userAgent || 'unknown',
						},
					});

					return {
						consent: consentRecord,
						record,
					};
				},
			});

			if (!result || !result.consent || !result.record) {
				throw new ORPCError('INTERNAL_SERVER_ERROR', 'Failed to create consent record');
			}

			const response = {
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

			logger.info('Set-consent successful', { consentId: response.id });

			// Ensure we're returning an object, not a primitive value
			return response;
		} catch (error) {
			// Log all errors properly
			logger.error('Error in set-consent handler', {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});

			// Re-throw to let error middleware handle it
			throw error;
		}
	});
