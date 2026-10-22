import { createRestKpiAdapter } from './restKpiAdapter.js';

export const sispaAdapter = createRestKpiAdapter({
  provider: 'sispa',
  endpointPath: '/api/kpis',
});
