import { useState } from 'react';
import { SYNC_STATUS_LABELS } from '@portal/shared';
import type { IntegrationProvider, SyncStatus } from '@portal/shared';
import { useCredentials, useSyncNow, useSyncRuns } from '../../../hooks/useIntegrations';
import { ApiError } from '../../../lib/api';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { useToast } from '../../ui/Toast';
import { mexicoYesterday } from './mexicoDates';

export function SyncNow({ provider }: { provider: IntegrationProvider }) {
  const { showToast } = useToast();
  const credentialsQuery = useCredentials();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;
  const syncNow = useSyncNow();
  const yesterday = mexicoYesterday();
  const [month, setMonth] = useState('');
  const [from, setFrom] = useState(yesterday);
  const [to, setTo] = useState(yesterday);
  const [watching, setWatching] = useState(false);
  const runsQuery = useSyncRuns(credential ? { credentialId: credential.id, limit: 1 } : null, watching);
  const last = runsQuery.data?.[0];
  const status = last?.status as SyncStatus | undefined;
  const active = status === 'queued' || status === 'running' || status === 'retrying';

  if (!credential) {
    return <Card><p className="text-sm text-muted">Guarda la conexión antes de sincronizar.</p></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sincronizar ahora</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-end gap-3">
        {provider === 'nexus_fuel' ? (
          <>
            <Input label="Desde" type="date" max={yesterday} value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input label="Hasta" type="date" max={yesterday} value={to} onChange={(event) => setTo(event.target.value)} />
          </>
        ) : (
          <Input label="Mes" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        )}
        <Button
          isLoading={syncNow.isPending}
          onClick={() => {
            const period = month ? `${month}-01` : undefined;
            syncNow.mutate(
              provider === 'nexus_fuel'
                ? { id: credential.id, from, to }
                : { id: credential.id, ...(period ? { period } : {}) },
              {
                onSuccess: () => {
                  setWatching(true);
                  showToast('Sincronización en cola', 'success');
                },
                onError: (error) =>
                  showToast(error instanceof ApiError ? error.message : 'No se pudo encolar la sincronización', 'danger'),
              },
            );
          }}
        >
          Sincronizar ahora
        </Button>
      </div>
      {last && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          Última ejecución
          <Badge tone={status === 'failed' ? 'danger' : status === 'success' ? 'success' : 'neutral'}>
            {status && status in SYNC_STATUS_LABELS ? SYNC_STATUS_LABELS[status] : last.status}
          </Badge>
          {active ? 'Actualizando…' : null}
        </p>
      )}
    </Card>
  );
}
