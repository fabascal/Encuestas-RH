import { authRoutes } from './auth.js';
import { bonusRoutes } from './bonus.js';
import { goalsRoutes } from './goals.js';
import { integrationsRoutes } from './integrations.js';
import { kpisRoutes } from './kpis.js';
import { orgRoutes } from './org.js';
import { reportsRoutes } from './reports.js';
import { userRoutes } from './users.js';
export async function registerRoutes(app) {
    await app.register(authRoutes);
    await app.register(orgRoutes);
    await app.register(userRoutes);
    await app.register(goalsRoutes);
    await app.register(bonusRoutes);
    await app.register(kpisRoutes);
    await app.register(integrationsRoutes);
    await app.register(reportsRoutes);
}
//# sourceMappingURL=index.js.map