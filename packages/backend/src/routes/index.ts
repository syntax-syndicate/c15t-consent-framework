import { os } from '@orpc/server';

// Define context type for our API - we'll import actual handlers after converting them
export type Context = {
	registry: Record<string, unknown>;
	adapter: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
	logger?: Record<string, unknown>;
	validated?: Record<string, unknown>;
	headers?: Record<string, string | string[] | undefined>;
};

// Create base procedure with context
export const pub = os.$context<Context>();

// Add placeholder for router - will be populated after converting all handlers
export const router = {
	// This will be replaced with actual handlers
};

// Type helpers for router when it's fully implemented
export type RouterInput<T> = {
	[K in keyof T]: Parameters<(T[K] extends { handler: (...args: any[]) => any } ? T[K]['handler'] : never)>[0]['input'];
};

export type RouterOutput<T> = {
	[K in keyof T]: ReturnType<(T[K] extends { handler: (...args: any[]) => any } ? T[K]['handler'] : never)> extends Promise<infer R> ? R : ReturnType<(T[K] extends { handler: (...args: any[]) => any } ? T[K]['handler'] : never)>;
};
