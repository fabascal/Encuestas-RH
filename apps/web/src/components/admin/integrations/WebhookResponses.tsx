import { useState } from 'react';
import { ArrowsClockwise, ChatText } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { IconTile } from '../../ui/IconTile';
import { Select } from '../../ui/Select';
import { Table } from '../../ui/Table';
import { useToast } from '../../ui/Toast';
import { ApiError } from '../../../lib/api';
import { useReprocessWebhook, useWebhookEvents } from '../../../hooks/useWebhookEvents';
import type { WebhookEventStatus } from '../../../hooks/useWebhookEvents';

const STATUS_LABEL: Record<WebhookEventStatus, string> = {
  processed: 'Procesada',
  unmatched: 'Sin estación',
  invalid: 'Inválida',
  error: 'Error',
  pending: 'Pendiente',
};

const STATUS_TONE = {
  processed: 'success',
  unmatched: 'warning',
  invalid: 'danger',
  error: 'danger',
  pending: 'neutral',
} as const;

export function WebhookResponses() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<WebhookEventStatus | ''>('');
  const eventsQuery = useWebhookEvents(status);
  const reprocess = useReprocessWebhook();

  const run = () => {
    reprocess.mutate(undefined, {
      onSuccess: (summary) => {
        showToast(
          `${summary.processed} procesadas, ${summary.invalid} inválidas, ${summary.unmatched} sin estación`,
          'success',
        );
      },
      onError: (error) => {
        showToast(error instanceof ApiError ? error.message : 'No se pudieron reprocesar los envíos', 'danger');
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={ChatText} size="sm" />}>Respuestas recibidas</CardTitle>
        <Button size="sm" onClick={run} isLoading={reprocess.isPending}>
          <ArrowsClockwise size={16} aria-hidden />
          Reprocesar pendientes
        </Button>
      </CardHeader>
      <div className="mb-4 max-w-xs">
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as WebhookEventStatus | '')}
          options={[
            { value: '', label: 'Todos' },
            { value: 'processed', label: 'Procesada' },
            { value: 'unmatched', label: 'Sin estación' },
            { value: 'invalid', label: 'Inválida' },
            { value: 'error', label: 'Error' },
            { value: 'pending', label: 'Pendiente' },
          ]}
        />
      </div>
      <Table
        columns={[
          { key: 'date', header: 'Fecha', render: (row) => row.received_at ?? '—' },
          { key: 'received', header: 'Estación recibida', render: (row) => row.received_station ?? '—' },
          { key: 'portal', header: 'Estación del portal', render: (row) => row.station_name ?? '—' },
          { key: 'score', header: 'Puntuación', render: (row) => row.received_score ?? '—' },
          {
            key: 'status',
            header: 'Estado',
            render: (row) => (
              <span className="flex flex-col items-start gap-1">
                <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                {row.status === 'unmatched' && (
                  <Link to="/admin/integraciones/google_forms/mapeo" className="text-sm text-brand hover:underline">
                    Ir a mapeo
                  </Link>
                )}
                {row.message && row.status !== 'processed' && <span className="text-xs text-muted">{row.message}</span>}
              </span>
            ),
          },
        ]}
        rows={eventsQuery.data ?? []}
        getRowKey={(row) => row.id}
        emptyMessage={eventsQuery.isLoading ? 'Cargando envíos…' : 'Todavía no llegan respuestas'}
      />
    </Card>
  );
}
