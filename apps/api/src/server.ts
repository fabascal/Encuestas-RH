import { buildApp } from './app.js';
import { apiEnv } from './config/apiEnv.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: '0.0.0.0', port: apiEnv.PORT });
  logger.info(`API listening on port ${apiEnv.PORT}`);
}

main().catch((error: unknown) => {
  logger.error(error, 'Failed to start API');
  process.exit(1);
});
