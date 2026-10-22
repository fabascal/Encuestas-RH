import { useQuery } from '@tanstack/react-query';
import type { DirectorOil } from '@portal/shared';
import { api } from '../lib/api';
import type { DirectorFilters } from './useDirectorSurveys';

export function useDirectorOil(filters: DirectorFilters) {
  const query: Record<string, string> = { year: String(filters.year) };
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;

  return useQuery({
    queryKey: ['direccion', 'aceite', query],
    queryFn: () => api.get<DirectorOil>('/direccion/aceite', query),
  });
}
