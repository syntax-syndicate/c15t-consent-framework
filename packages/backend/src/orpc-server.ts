import { RPCHandler } from '@orpc/server/node';
import { OpenAPIHandler } from '@orpc/openapi/node';
import { CORSPlugin } from '@orpc/server/plugins';
import { createServer } from 'node:http';
import { router } from './routes';
import { createLogger } from './pkgs/logger';

/**
 * Example oRPC server setup.
 * 
 * This file demonstrates how to set up an oRPC server with your routes.
 * It provides both RPC and OpenAPI endpoints.
 */

// Create handlers
const rpcHandler = new RPCHandler(router);
const openAPIHandler = new OpenAPIHandler(router, {
  info: {
    title: 'C15T API',
    version: '1.0.0',
    description: 'API for the c15t consent management system',
  },
});

// Create a simple HTTP server
const server = createServer(async (req, res) => {
  const logger = createLogger();
  
  try {
    // Handle RPC requests
    if (req.url?.startsWith('/rpc')) {
      return await rpcHandler.handle(req, res, {
        prefix: '/rpc',
        plugins: [new CORSPlugin()],
        context: {
          // You would inject your actual registry and adapter here
          registry: {},
          adapter: {},
          ipAddress: req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          logger: logger,
          headers: req.headers,
        },
      });
    }
    
    // Handle OpenAPI requests (allows using standard HTTP clients)
    if (req.url?.startsWith('/api')) {
      return await openAPIHandler.handle(req, res, {
        prefix: '/api',
        plugins: [new CORSPlugin()],
        context: {
          registry: {},
          adapter: {},
          ipAddress: req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          logger: logger,
          headers: req.headers,
        },
      });
    }
    
    // OpenAPI documentation
    if (req.url === '/docs' || req.url === '/docs/') {
      res.writeHead(302, { Location: '/docs/swagger' });
      return res.end();
    }
    
    if (req.url?.startsWith('/docs/swagger')) {
      return await openAPIHandler.serveSwagger(req, res, { path: '/docs/swagger' });
    }
    
    if (req.url?.startsWith('/docs/redoc')) {
      return await openAPIHandler.serveRedoc(req, res, { path: '/docs/redoc' });
    }
    
    // 404 for unhandled routes
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    logger.error('Server error', { error });
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`- RPC endpoint: http://localhost:${PORT}/rpc`);
  console.log(`- REST API: http://localhost:${PORT}/api`);
  console.log(`- API Documentation: http://localhost:${PORT}/docs`);
});

export default server; 