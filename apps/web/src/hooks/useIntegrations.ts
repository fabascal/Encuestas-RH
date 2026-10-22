import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateIntegrationCredentialInput, IntegrationProvider } from '@portal/shared';
import { api } from '../lib/api';

export interface CredentialRow {
  id: string;
  provider: IntegrationProvider;
  company_id: string | null;
  config: Record<string, unknown>;
  cron_expression: string;
  enabled: boolean;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncRunRow {
  id: string;
  credential_id: string;
  provider: IntegrationProvider;
  status: string;
  attempt: number;
  records_read: number;
  records_upserted: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export function useCredentials() {
  return useQuery({
    queryKey: ['integration-credentials'],
    queryFn: () => api.get<CredentialRow[]>('/admin/integrations/credentials'),
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIntegrationCredentialInput) =>
      api.post<CredentialRow>('/admin/integrations/credentials', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-credentials'] }),
  });
}

export interface UpdateCredentialPayload {
  secret?: string;
  config?: Record<string, unknown>;
  cronExpression?: string;
  enabled?: boolean;
}

export function useUpdateCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCredentialPayload }) =>
      api.patch<CredentialRow>(`/admin/integrations/credentials/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-credentials'] }),
  });
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<TestConnectionResult>(`/admin/integrations/credentials/${id}/test`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integration-credentials'] }),
  });
}

export function useSyncRuns(filters: { credentialId?: string; provider?: string; limit?: number } | null, poll = false) {
  return useQuery({
    queryKey: ['sync-runs', filters],
    queryFn: () =>
      api.get<SyncRunRow[]>('/admin/integrations/sync-runs', {
        credentialId: filters?.credentialId,
        provider: filters?.provider,
        limit: filters?.limit,
      }),
    enabled: filters !== null,
    refetchInterval: poll ? 4000 : false,
  });
}

export interface PreviewRecord {
  externalStationId: string;
  period: string;
  value: number;
  stationId: string | null;
  stationName: string | null;
  mapped: boolean;
}

export function usePreview() {
  return useMutation({
    mutationFn: ({ id, period }: { id: string; period?: string }) =>
      api.post<{ records: PreviewRecord[] }>(`/admin/integrations/credentials/${id}/preview`, { period, limit: 50 }),
  });
}

export function useSyncNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, period, from, to }: { id: string; period?: string; from?: string; to?: string }) =>
      api.post<{ jobId: string }>(`/admin/integrations/credentials/${id}/sync`, {
        ...(period ? { period } : {}),
        ...(from && to ? { from, to } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-runs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['sync-day'] });
    },
  });
}

export interface CalendarDayRow {
  day: string;
  status: 'success' | 'failed' | 'running';
  stations_count: number;
  total_amount: string;
  unmatched_count: number;
  last_synced_at: string | null;
  error_message: string | null;
}

export function useSyncCalendar(credentialId: string | null, month: string) {
  return useQuery({
    queryKey: ['sync-calendar', credentialId, month],
    queryFn: () =>
      api.get<{ days: CalendarDayRow[] }>(`/admin/integrations/credentials/${credentialId}/calendar`, {
        month: `${month}-01`,
      }),
    enabled: Boolean(credentialId),
  });
}

export interface SyncDayStation {
  code: string;
  amount: number;
  stationName: string | null;
  matched: boolean;
}

export interface SyncDayDetail {
  day: string;
  summary: {
    status: 'success' | 'failed' | 'running';
    stations_count: number;
    total_amount: string;
    unmatched_count: number;
    last_synced_at: string | null;
    error_message: string | null;
    stations: SyncDayStation[];
  } | null;
  runs: {
    id: string;
    status: string;
    records_upserted: number;
    error_message: string | null;
    started_at: string | null;
    finished_at: string | null;
    logs: { id: string; level: string; message: string; logged_at: string }[];
  }[];
}

export function useSyncDay(credentialId: string | null, day: string | null) {
  return useQuery({
    queryKey: ['sync-day', credentialId, day],
    queryFn: () => api.get<SyncDayDetail>(`/admin/integrations/credentials/${credentialId}/days/${day}`),
    enabled: Boolean(credentialId && day),
  });
}

export interface StationRefRow {
  id: string;
  provider: IntegrationProvider;
  external_id: string;
  station_id: string;
  station_name: string;
}

export function useStationRefs(provider: string | null) {
  return useQuery({
    queryKey: ['station-refs', provider],
    queryFn: () => api.get<StationRefRow[]>(`/admin/integrations/${provider}/station-refs`),
    enabled: Boolean(provider),
  });
}

export function useCreateStationRef(provider: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { externalId: string; stationId: string }) =>
      api.post(`/admin/integrations/${provider}/station-refs`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['station-refs', provider] }),
  });
}

export function useDeleteStationRef(provider: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/integrations/station-refs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['station-refs', provider] }),
  });
}

export interface SyncLogRow {
  id: string;
  level: string;
  message: string;
  logged_at: string;
}

export function useSyncRunLogs(syncRunId: string | null) {
  return useQuery({
    queryKey: ['sync-logs', syncRunId],
    queryFn: () => api.get<SyncLogRow[]>(`/admin/integrations/sync-runs/${syncRunId}/logs`),
    enabled: Boolean(syncRunId),
  });
}
