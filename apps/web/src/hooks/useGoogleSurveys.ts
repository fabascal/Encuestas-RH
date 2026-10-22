import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoogleSurveyDetail, GoogleSurveyList } from '@portal/shared';
import { api } from '../lib/api';

export interface GoogleSurveyFilters {
  period: string;
  companyId: string | null;
  zoneId: string | null;
  stationId: string | null;
  estado: 'todas' | 'consideradas' | 'no_consideradas';
}

export function useGoogleSurveys(filters: GoogleSurveyFilters) {
  const query: Record<string, string> = { period: filters.period, estado: filters.estado };
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.stationId) query.stationId = filters.stationId;
  return useQuery({
    queryKey: ['origen', 'google', query],
    queryFn: () => api.get<GoogleSurveyList>('/origen/google/encuestas', query),
  });
}

export function useGoogleSurvey(id: string) {
  return useQuery({
    queryKey: ['origen', 'google', id],
    queryFn: () => api.get<GoogleSurveyDetail>(`/origen/google/encuestas/${id}`),
    enabled: Boolean(id),
  });
}

export function useSetSurveyExcluded() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; excluded: boolean; reason?: string }) =>
      api.patch<GoogleSurveyDetail>(`/origen/google/encuestas/${input.id}`, {
        excluded: input.excluded,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['origen'] });
      void client.invalidateQueries({ queryKey: ['direccion'] });
      void client.invalidateQueries({ queryKey: ['report'] });
    },
  });
}
