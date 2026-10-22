import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { apiEnv } from './config/apiEnv.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { registerRoutes } from './routes/index.js';
import { buildLoggerOptions } from './utils/logger.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: buildLoggerOptions(), trustProxy: true });

  await app.register(helmet);
  await app.register(cors, {
    origin: apiEnv.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, { secret: apiEnv.JWT_ACCESS_SECRET });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(registerRoutes, { prefix: '/api' });

  return app;
}
