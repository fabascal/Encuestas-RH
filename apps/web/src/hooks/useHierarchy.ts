import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface CompanyRow {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ZoneRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface StationRow {
  id: string;
  zone_id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get<CompanyRow[]>('/companies'),
  });
}

export function useZones(companyId: string | null) {
  return useQuery({
    queryKey: ['zones', companyId],
    queryFn: () => api.get<ZoneRow[]>('/zones', companyId ? { companyId } : undefined),
  });
}

export interface ManagerRow {
  id: string;
  name: string;
  stationCount: number;
}

export function useManagers(companyId: string | null, zoneId: string | null, enabled: boolean) {
  const query: Record<string, string> = {};
  if (companyId) query.companyId = companyId;
  if (zoneId) query.zoneId = zoneId;
  return useQuery({
    queryKey: ['managers', companyId, zoneId],
    queryFn: () => api.get<ManagerRow[]>('/managers', Object.keys(query).length > 0 ? query : undefined),
    enabled,
  });
}

export function useStations(zoneId: string | null, managerId: string | null = null) {
  const query: Record<string, string> = {};
  if (zoneId) query.zoneId = zoneId;
  if (managerId) query.managerId = managerId;
  return useQuery({
    queryKey: ['stations', zoneId, managerId],
    queryFn: () => api.get<StationRow[]>('/stations', Object.keys(query).length > 0 ? query : undefined),
    enabled: Boolean(zoneId || managerId),
  });
}

/** Unfiltered station list, used by pickers (e.g. user scope assignment) that need every option. */
export function useAllStations() {
  return useQuery({
    queryKey: ['stations', 'all'],
    queryFn: () => api.get<StationRow[]>('/stations'),
  });
}
