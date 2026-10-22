import { useQuery } from '@tanstack/react-query';
import type { ReportId } from '@portal/shared';
import { api, downloadFile } from '../lib/api';

export interface ReportFilters {
  period: string;
  months: number;
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
}

export function reportQuery(filters: ReportFilters, withMonths: boolean): Record<string, string> {
  const query: Record<string, string> = { period: filters.period };
  if (withMonths) query.months = String(filters.months);
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.managerId) query.managerId = filters.managerId;
  if (filters.stationId) query.stationId = filters.stationId;
  return query;
}

export function useReport<T>(id: ReportId, filters: ReportFilters, withMonths: boolean, enabled: boolean) {
  const query = reportQuery(filters, withMonths);
  return useQuery({
    queryKey: ['report', id, query],
    queryFn: () => api.get<T>(`/reports/${id}`, query),
    enabled,
  });
}

export function downloadReport(id: ReportId, format: 'pdf' | 'xlsx', filters: ReportFilters, withMonths: boolean): Promise<void> {
  const query = reportQuery(filters, withMonths);
  return downloadFile(`/reports/${id}.${format}`, `reporte-${id}-${filters.period}.${format}`, query);
}
