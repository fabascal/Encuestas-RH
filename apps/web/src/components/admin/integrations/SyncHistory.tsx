import { useState } from 'react';
import { SYNC_STATUS_LABELS } from '@portal/shared';
import type { IntegrationProvider, SyncStatus } from '@portal/shared';
import { useCredentials, useSyncRunLogs, useSyncRuns } from '../../../hooks/useIntegrations';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Table } from '../../ui/Table';

function statusLabel(status: string): string {
  return status in SYNC_STATUS_LABELS ? SYNC_STATUS_LABELS[status as SyncStatus] : status;
}

export function SyncHistory({ provider }: { provider: IntegrationProvider }) {
  const credentialsQuery = useCredentials();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;
  const runsQuery = useSyncRuns(credential ? { credentialId: credential.id, limit: 50 } : { provider, limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const logsQuery = useSyncRunLogs(selectedId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <Table
          columns={[
            { key: 'status', header: 'Estado', render: (row) => <Badge tone="neutral">{statusLabel(row.status)}</Badge> },
            { key: 'read', header: 'Leídos', render: (row) => row.records_read },
            { key: 'written', header: 'Guardados', render: (row) => row.records_upserted },
            {
              key: 'start',
              header: 'Inicio',
              render: (row) => (row.started_at ? new Date(row.started_at).toLocaleString('es-MX') : '—'),
            },
            {
              key: 'end',
              header: 'Fin',
              render: (row) => (row.finished_at ? new Date(row.finished_at).toLocaleString('es-MX') : '—'),
            },
            { key: 'error', header: 'Error', render: (row) => row.error_message ?? '—' },
            {
              key: 'log',
              header: '',
              render: (row) => (
                <Button size="sm" variant="secondary" onClick={() => setSelectedId(row.id)}>
                  Ver bitácora
                </Button>
              ),
            },
          ]}
          rows={runsQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Sin sincronizaciones"
        />
      </Card>
      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle>Bitácora</CardTitle>
          </CardHeader>
          <Table
            columns={[
              { key: 'level', header: 'Nivel', render: (row) => row.level },
              { key: 'message', header: 'Mensaje', render: (row) => row.message },
              { key: 'at', header: 'Fecha', render: (row) => new Date(row.logged_at).toLocaleString('es-MX') },
            ]}
            rows={logsQuery.data ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Sin mensajes"
          />
        </Card>
      )}
    </div>
  );
}
