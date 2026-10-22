import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type WebhookEventStatus = 'pending' | 'processed' | 'unmatched' | 'invalid' | 'error';

export interface WebhookEventRow {
  id: string;
  status: WebhookEventStatus;
  message: string | null;
  created_at: string;
  processed_at: string | null;
  station_id: string | null;
  station_name: string | null;
  received_station: string | null;
  received_score: string | null;
  received_at: string | null;
}

export interface ReprocessSummary {
  pending: number;
  processed: number;
  unmatched: number;
  invalid: number;
  error: number;
}

export function useWebhookEvents(status: WebhookEventStatus | '' = '') {
  return useQuery({
    queryKey: ['webhook-events', status || 'all'],
    queryFn: () =>
      api.get<WebhookEventRow[]>(
        '/webhook/events',
        status ? { limit: 200, status } : { limit: 200 },
      ),
  });
}

export function useReprocessWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ReprocessSummary>('/webhook/events/reprocess', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhook-events'] }),
  });
}
