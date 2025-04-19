# Migration to oRPC

This document outlines the steps to complete the migration from the custom router to oRPC.

## Current Status

We've started to convert the existing routes to oRPC procedures:

- Created basic router structure in `index.ts`
- Converted `status.ts` to use oRPC
- Converted `show-consent-banner.ts` to use oRPC
- Converted `verify-consent.ts` to use oRPC
- Converted `set-consent.ts` to use oRPC
- Created a sample server setup in `orpc-server.ts`

## Steps to Complete Migration

1. **Fix Type Issues**

   The current implementation has some TypeScript errors. Update the Context type in `index.ts` to properly type the registry and adapter:

   ```typescript
   // Example proper typing
   import type { Registry } from '../path/to/registry';
   import type { Adapter } from '../path/to/adapter';

   export type Context = {
     registry: Registry;
     adapter: Adapter;
     ipAddress?: string;
     userAgent?: string;
     logger: Logger;
     headers?: Record<string, string | string[] | undefined>;
   };
   ```

2. **Fix Router Export**

   Update the router export in `index.ts` to use the actual handlers:

   ```typescript
   export const router = pub.router({
     status: statusHandler,
     showConsentBanner: showConsentBannerHandler, 
     setConsent: setConsentHandler,
     verifyConsent: verifyConsentHandler,
   });
   ```

3. **Install Required Dependencies**

   Make sure you have all required dependencies:

   ```bash
   npm install @orpc/server @orpc/openapi
   ```

4. **Server Integration**

   Integrate with your server framework. For example, with Next.js:

   ```typescript
   // app/api/[...orpc]/route.ts
   import { serve } from '@orpc/server/next';
   import { RPCHandler } from '@orpc/server/next';
   import { router } from 'path/to/routes';

   const rpcHandler = new RPCHandler(router);

   export const { GET, POST } = serve(rpcHandler, {
     prefix: '/api',
     context: async (req) => ({
       registry: yourRegistry,
       adapter: yourAdapter,
       ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
       userAgent: req.headers.get('user-agent') || 'unknown',
       logger: yourLogger,
       headers: Object.fromEntries(req.headers.entries()),
     }),
   });
   ```

5. **Client Implementation**

   Create type-safe clients:

   ```typescript
   // client.ts
   import { createClient } from '@orpc/client';
   import type { RouterInput, RouterOutput } from './routes';

   export const client = createClient<typeof router>({
     url: '/api',
   });

   // Usage
   const status = await client.status.query();
   ```

6. **React Integration (Optional)**

   If using React, add React integration:

   ```bash
   npm install @orpc/react
   ```

   ```typescript
   // hooks.ts
   import { createHooks } from '@orpc/react';
   import { client } from './client';

   export const { useQuery, useMutation } = createHooks({
     client,
   });

   // Usage
   const { data } = useQuery((client) => client.status);
   ```

## Benefits of oRPC

- **Type Safety**: End-to-end type safety between client and server
- **Documentation**: Automatic OpenAPI documentation
- **Validation**: Built-in schema validation
- **Error Handling**: Standardized error handling
- **Framework Agnostic**: Works with any framework
- **File Uploads**: Built-in support for file uploads
- **Modularity**: Easy to add new routes and organize code

## Additional Resources

- [oRPC Documentation](https://orpc.unnoq.com/)
- [oRPC GitHub Repository](https://github.com/unnoq/orpc) 