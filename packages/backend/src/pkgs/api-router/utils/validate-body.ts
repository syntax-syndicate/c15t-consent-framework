import { createError, readBody, readFormData, type H3Event } from 'h3';
import type { ZodSchema } from 'zod';
import superjson from 'superjson';

/**
 * Validates and parses request body data with proper type conversion
 *
 * @param event - The H3Event containing the request data
 * @param schema - Zod schema to validate the body against
 * @returns The parsed and validated body data
 *
 * @throws {H3Error} When body validation fails or parsing errors occur
 */
export default async function validateBody<T>(
	event: H3Event,
	schema: ZodSchema<T>
): Promise<T> {
	try {
		// Get raw body based on content type
		const rawBody = event.headers
			.get('content-type')
			?.includes('multipart/form-data')
			? Object.fromEntries(await readFormData(event))
			: await readBody(event);

		// Handle null or undefined body
		if (!rawBody) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Request body is required',
			});
		}

		// Pre-process the body to handle common string conversions
		const processedBody: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(rawBody)) {
			if (typeof value === 'string') {
				// Handle boolean strings
				if (value.toLowerCase() === 'true') {
					processedBody[key] = true;
					continue;
				}
				if (value.toLowerCase() === 'false') {
					processedBody[key] = false;
					continue;
				}

				// Handle array strings
				if (value.startsWith('[') && value.endsWith(']')) {
					try {
						// Safely evaluate array string
						processedBody[key] = JSON.parse(value.replace(/'/g, '"'));
						continue;
					} catch {
						// If parsing fails, keep original value
						processedBody[key] = value;
					}
				}
			}
			processedBody[key] = value;
		}

		// Use SuperJSON for any remaining complex type conversions
		const serializedBody = superjson.stringify(processedBody);
		const parsedBody = superjson.parse(serializedBody);
		console.log('parsedBody', parsedBody);
		// Validate with Zod schema
		const result = schema.safeParse(parsedBody);

		if (!result.success) {
			console.log('result.error', result.error);
			throw createError({
				statusCode: 400,
				statusMessage: 'Invalid request body',
				data: result.error.issues,
			});
		}

		return result.data;
	} catch (error: unknown) {
		console.log('error', error);
		if (
			error instanceof Error &&
			'statusCode' in error &&
			error.statusCode === 400
		) {
			throw error;
		}

		throw createError({
			statusCode: 400,
			statusMessage: 'Failed to parse request body',
			data: {
				message: error instanceof Error ? error.message : 'Unknown error',
			},
		});
	}
}
