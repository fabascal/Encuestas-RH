import type { IntegrationProvider } from '@portal/shared';
import type { IntegrationAdapter } from './types.js';
import { googleFormsAdapter } from './googleForms.js';
import { nexusFuelAdapter } from './nexusFuel.js';
import { nomina3Adapter } from './nomina3.js';
import { sispaAdapter } from './sispa.js';

export const integrationAdapters: Record<IntegrationProvider, IntegrationAdapter> = {
  google_forms: googleFormsAdapter,
  nexus_fuel: nexusFuelAdapter,
  nomina3: nomina3Adapter,
  sispa: sispaAdapter,
};
