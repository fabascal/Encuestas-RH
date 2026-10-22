import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NexusOilMonth, NexusRefetchStatus } from '@portal/shared';
import { useToast } from '../components/ui/Toast';
import { ApiError, api } from '../lib/api';

export interface NexusOilFilters {
  period: string;
  companyId: string | null;
  zoneId: string | null;
  stationId: string | null;
}

export function useNexusOil(filters: NexusOilFilters) {
  const query: Record<string, string> = { period: filters.period };
  if (filters.companyId) query.companyId = filters.companyId;
  if (filters.zoneId) query.zoneId = filters.zoneId;
  if (filters.stationId) query.stationId = filters.stationId;
  return useQuery({
    queryKey: ['origen', 'nexus', query],
    queryFn: () => api.get<NexusOilMonth>('/origen/nexus/aceite', query),
  });
}

export function useRefetchNexus() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const toasted = useRef<string | null>(null);

  const status = useQuery({
    queryKey: ['origen', 'nexus', 'job', jobId],
    queryFn: () => api.get<NexusRefetchStatus>(`/origen/nexus/consultas/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const current = query.state.data?.status;
      if (current === 'success' || current === 'failed') return false;
      return 3000;
    },
  });

  useEffect(() => {
    const current = status.data;
    if (!jobId || !current) return;
    if (current.status !== 'success' && current.status !== 'failed') return;
    const key = `${jobId}:${current.status}`;
    if (toasted.current === key) return;
    toasted.current = key;
    if (current.status === 'success') {
      showToast('Venta de aceite actualizada', 'success');
      void client.invalidateQueries({ queryKey: ['origen'] });
      void client.invalidateQueries({ queryKey: ['direccion'] });
      void client.invalidateQueries({ queryKey: ['report'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void client.invalidateQueries({ queryKey: ['kpi-facts'] });
      void client.invalidateQueries({ queryKey: ['station-bonus'] });
    } else {
      showToast(current.message ?? 'No se pudo actualizar la venta de aceite', 'danger');
    }
    setJobId(null);
  }, [client, jobId, showToast, status.data]);

  const mutation = useMutation({
    mutationFn: (input: { from: string; to: string }) => api.post<{ jobId: string }>('/origen/nexus/consultar', input),
    onSuccess: (result) => setJobId(result.jobId),
    onError: (error) => {
      showToast(error instanceof ApiError ? error.message : 'No se pudo consultar Nexus', 'danger');
    },
  });

  return {
    start: mutation.mutate,
    isBusy: mutation.isPending || jobId !== null,
  };
}
