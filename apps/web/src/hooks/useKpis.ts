import { useQuery } from '@tanstack/react-query';
import type { KpiUnit } from '@portal/shared';
import { api } from '../lib/api';

export interface KpiCategoryRow {
  id: string;
  code: string;
  name: string;
  unit: KpiUnit;
  higher_is_better: boolean;
  source_provider: string | null;
  active: boolean;
}

export interface KpiFactRow {
  id: string;
  kpi_code: string;
  kpi_name: string;
  unit: KpiUnit;
  value: string;
  period: string;
  source: string;
}

export function useKpiCategories() {
  return useQuery({
    queryKey: ['kpi-categories'],
    queryFn: () => api.get<KpiCategoryRow[]>('/kpi-categories'),
  });
}

export function useKpiFacts(stationId: string | null, period: string) {
  return useQuery({
    queryKey: ['kpi-facts', stationId, period],
    queryFn: () => api.get<KpiFactRow[]>(`/stations/${stationId}/kpi-facts`, { period }),
    enabled: Boolean(stationId),
  });
}
