import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { DirectorCoverage } from '@portal/shared';
import { api } from '../lib/api';
import type { DirectorFilters } from './useDirectorSurveys';

export function useSurveyCoverage(filters: DirectorFilters, enabled: boolean) {
  const query: Record<string, string> = { year: String(filters.year) };
  if (filters.month) query.month = String(filters.month);
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;

  return useQuery({
    queryKey: ['direccion', 'cobertura', query],
    queryFn: () => api.get<DirectorCoverage>('/direccion/encuestas/cobertura', query),
    enabled,
    placeholderData: keepPreviousData,
  });
}
