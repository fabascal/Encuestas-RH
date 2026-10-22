import { useQuery } from '@tanstack/react-query';
import type { PanelOil } from '@portal/shared';
import { api } from '../lib/api';

export interface OilPanelFilters {
  period: string;
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
}

export function useOilPanel(filters: OilPanelFilters) {
  const query: Record<string, string> = { period: filters.period };
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;

  return useQuery({
    queryKey: ['panel', 'aceite', query],
    queryFn: () => api.get<PanelOil>('/panel/aceite', query),
  });
}
