import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import type { DirectorSurveySheets, GoogleSurveyDetail } from '@portal/shared';
import { api } from '../lib/api';
import type { DirectorFilters } from './useDirectorSurveys';

function sheetQuery(filters: DirectorFilters, section: string): Record<string, string> {
  const query: Record<string, string> = { year: String(filters.year), section };
  if (filters.month) query.month = String(filters.month);
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;
  return query;
}

export function useSurveySheets(filters: DirectorFilters, section: string, enabled: boolean) {
  const query = sheetQuery(filters, section);
  return useQuery({
    queryKey: ['direccion', 'hojas', query],
    queryFn: () => api.get<DirectorSurveySheets>('/direccion/encuestas/hojas', query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function surveySheetKey(id: string): readonly ['direccion', 'hoja', string] {
  return ['direccion', 'hoja', id];
}

export function useSurveySheet(id: string | null) {
  return useQuery({
    queryKey: surveySheetKey(id ?? ''),
    queryFn: () => api.get<GoogleSurveyDetail>(`/direccion/encuestas/hojas/${id}`),
    enabled: id !== null,
  });
}

export function prefetchSurveySheet(client: QueryClient, id: string): Promise<void> {
  return client.prefetchQuery({
    queryKey: surveySheetKey(id),
    queryFn: () => api.get<GoogleSurveyDetail>(`/direccion/encuestas/hojas/${id}`),
    staleTime: 60_000,
  });
}
