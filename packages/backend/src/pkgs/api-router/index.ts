import { createApp, createRouter, toWebHandler } from 'h3';
import { routes } from '~/routes';
import { getIp } from './utils/ip';
import type { C15TOptions } from '~/types';
interface RouterProps {
	options: C15TOptions;
}

export function createApiHandler({ options }: RouterProps) {
	// Create an app instance
	const app = createApp({
		onRequest(event) {
			// Set the context
			event.context.ipAddress = getIp(event.headers, options);
			event.context.userAgent = event.node.req.headers['user-agent'] || null;

			console.log(event.context);
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
