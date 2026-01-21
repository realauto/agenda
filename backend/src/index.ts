import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { serverConfig, corsConfig } from './config/index.js';
import mongoPlugin from './plugins/mongodb.js';
import authPlugin from './plugins/auth.js';
import swaggerPlugin from './plugins/swagger.js';
import { rateLimiter } from './middleware/index.js';
import {
  authRoutes,
  usersRoutes,
  teamsRoutes,
  projectsRoutes,
  updatesRoutes,
  invitesRoutes,
} from './routes/index.js';

const fastify = Fastify({
  logger: {
    level: serverConfig.nodeEnv === 'development' ? 'info' : 'warn',
    transport:
      serverConfig.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

async function buildApp() {
  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, corsConfig);

  // Rate limiting
  await fastify.register(rateLimiter);

  // Swagger (only in development)
  if (serverConfig.nodeEnv === 'development') {
    await fastify.register(swaggerPlugin);
  }

  // Database
  await fastify.register(mongoPlugin);

  // Auth
  await fastify.register(authPlugin);

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(teamsRoutes, { prefix: '/api/teams' });
  await fastify.register(projectsRoutes, { prefix: '/api' });
  await fastify.register(updatesRoutes, { prefix: '/api' });
  await fastify.register(invitesRoutes, { prefix: '/api' });

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: serverConfig.port,
      host: serverConfig.host,
    });

    console.log(`
    🚀 ProjectLog API Server
    ========================
    Environment: ${serverConfig.nodeEnv}
    Server: http://${serverConfig.host}:${serverConfig.port}
    Docs: http://${serverConfig.host}:${serverConfig.port}/docs
    Health: http://${serverConfig.host}:${serverConfig.port}/health
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
