import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCompanyInput,
  CreateStationInput,
  CreateZoneInput,
  UpdateCompanyInput,
  UpdateStationInput,
  UpdateZoneInput,
} from '@portal/shared';
import { api } from '../lib/api';
import type { CompanyRow, StationRow, ZoneRow } from './useHierarchy';

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => api.post<CompanyRow>('/admin/companies', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateCompanyInput) =>
      api.patch<CompanyRow>(`/admin/companies/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useSetCompanyActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<CompanyRow>(`/admin/companies/${id}/active`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateZoneInput) => api.post<ZoneRow>('/admin/zones', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zones'] }),
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateZoneInput) =>
      api.patch<ZoneRow>(`/admin/zones/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zones'] }),
  });
}

export function useSetZoneActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<ZoneRow>(`/admin/zones/${id}/active`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zones'] }),
  });
}

export function useCreateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStationInput) => api.post<StationRow>('/admin/stations', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }),
  });
}

export function useUpdateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateStationInput) =>
      api.patch<StationRow>(`/admin/stations/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }),
  });
}

export function useSetStationActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<StationRow>(`/admin/stations/${id}/active`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] }),
  });
}
