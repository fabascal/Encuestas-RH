import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DirectorSurveys } from '@portal/shared';
import { api } from '../lib/api';

export interface DirectorFilters {
  year: number;
  month?: number;
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
}

export function useDirectorSurveys(filters: DirectorFilters, enabled = true) {
  const query: Record<string, string> = { year: String(filters.year) };
  if (filters.month) query.month = String(filters.month);
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;

  return useQuery({
    queryKey: ['direccion', 'encuestas', query],
    queryFn: () => api.get<DirectorSurveys>('/direccion/encuestas', query),
    enabled,
    placeholderData: keepPreviousData,
  });
}
