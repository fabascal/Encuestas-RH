import type { IntegrationAdapter } from './types.js';
interface RestKpiAdapterOptions {
    provider: 'nexus_fuel' | 'nomina3' | 'sispa';
    endpointPath: string;
}
export declare function createRestKpiAdapter({ provider, endpointPath }: RestKpiAdapterOptions): IntegrationAdapter;
export {};
//# sourceMappingURL=restKpiAdapter.d.ts.map