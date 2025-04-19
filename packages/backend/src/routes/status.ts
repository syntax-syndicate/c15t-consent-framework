
import { z } from 'zod';
import { version } from '../../package.json';
import { pub } from './index';

/**
 * Response type for the status endpoint
 * @public
 */
export interface StatusResponse {
	status: 'ok' | 'error';
	version: string;
	timestamp: string;
	storage: {
		type: string;
		available: boolean;
	};
}

/**
 * Status endpoint that returns information about the c15t instance.
 *
 * This endpoint provides basic operational information about the c15t instance,
 * including its version, current timestamp, and storage adapter configuration.
 * It can be used for:
 * - Health checks to verify the API is operational
 * - Version verification
 * - Storage adapter verification
 * - Retrieving configuration information about the consent system
 *
 * The endpoint does not require authentication and is accessible via a GET request.
 *
 * @endpoint GET /status
 * @responseExample
 * ```json
 * {
 *   "status": "ok",
 *   "version": "1.0.0",
 *   "timestamp": "2023-04-01T12:34:56.789Z",
 *   "storage": {
 *     "type": "MemoryAdapter",
 *     "available": true
 *   }
 * }
 * ```
 */
export const statusHandler = pub
	.route({
		path: '/status',
		method: 'GET',
	})
	.output(
		z.object({
			status: z.enum(['ok', 'error']),
			version: z.string(),
			timestamp: z.string(),
			storage: z.object({
				type: z.string(),
				available: z.boolean(),
			}),
		})
	)
	.handler(async ({ context }) => {
		const response: StatusResponse = {
			status: 'ok',
			version: version,
			timestamp: new Date().toISOString(),
			storage: {
				type: context.adapter?.id ?? 'Unavailable',
				available: !!context.adapter,
			},
		};

		return response;
	});
