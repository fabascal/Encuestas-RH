import { createRestKpiAdapter } from './restKpiAdapter.js';

export const nomina3Adapter = createRestKpiAdapter({
  provider: 'nomina3',
  endpointPath: '/api/kpis',
});
