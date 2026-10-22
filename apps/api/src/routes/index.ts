import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { bonusRoutes } from './bonus.js';
import { goalsRoutes } from './goals.js';
import { integrationsRoutes } from './integrations.js';
import { kpisRoutes } from './kpis.js';
import { orgRoutes } from './org.js';
import { direccionRoutes } from './direccion.js';
import { origenRoutes } from './origen.js';
import { panelRoutes } from './panel.js';
import { reportsRoutes } from './reports.js';
import { rolesRoutes } from './roles.js';
import { userRoutes } from './users.js';
import { webhookRoutes } from './webhook.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes);
  await app.register(orgRoutes);
  await app.register(userRoutes);
  await app.register(rolesRoutes);
  await app.register(goalsRoutes);
  await app.register(bonusRoutes);
  await app.register(kpisRoutes);
  await app.register(integrationsRoutes);
  await app.register(direccionRoutes);
  await app.register(origenRoutes);
  await app.register(panelRoutes);
  await app.register(reportsRoutes);
  await app.register(webhookRoutes);
}
