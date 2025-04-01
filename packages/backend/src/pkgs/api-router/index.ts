import { createApp, createRouter, toWebHandler } from 'h3';
import { routes } from '~/routes';
import type { RouterProps } from './types';
import { getIp } from './utils/ip';

export function createApiHandler({ options, context }: RouterProps) {
	// Create an app instance
	const app = createApp({
		onRequest(event) {
			event.context.ipAddress = getIp(event.headers, options);
			event.context.userAgent = event.node.req.headers['user-agent'] || null;
			event.context.registry = context.registry;
			event.context.adapter = context.adapter;
		},
	});

	// Create a new router and register it in app
	const router = createRouter();
	app.use(router);

	// Initialize routes
	for (const route of routes) {
		router[route.method](route.path, route.handler);
	}

	const handler = toWebHandler(app);

	return { handler };
}
