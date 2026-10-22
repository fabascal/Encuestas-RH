import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { IntegrationProvider } from '@portal/shared';
import { useCredentials, usePreview, useTestConnection } from '../../../hooks/useIntegrations';
import { ApiError } from '../../../lib/api';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Table } from '../../ui/Table';
import { useToast } from '../../ui/Toast';
import { mexicoYesterday } from './mexicoDates';

function monthToPeriod(month: string): string | undefined {
  return month ? `${month}-01` : undefined;
}

export function ConnectionTest({ provider }: { provider: IntegrationProvider }) {
  const { showToast } = useToast();
  const credentialsQuery = useCredentials();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;
  const testConnection = useTestConnection();
  const preview = usePreview();
  const [month, setMonth] = useState('');

  if (!credential) {
    return <Card><p className="text-sm text-muted">Guarda la conexión antes de probarla.</p></Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Probar conexión</CardTitle>
          <Button
            onClick={() =>
              testConnection.mutate(credential.id, {
                onSuccess: (result) => showToast(result.message, result.success ? 'success' : 'danger'),
                onError: (error) => showToast(error instanceof ApiError ? error.message : 'La prueba falló', 'danger'),
              })
            }
            isLoading={testConnection.isPending}
          >
            Probar conexión
          </Button>
        </CardHeader>
        {credential.last_test_message && <p className="text-sm text-muted">{credential.last_test_message}</p>}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Input
              label="Mes"
              type="month"
              value={month}
              {...(provider === 'nexus_fuel' ? { max: mexicoYesterday().slice(0, 7) } : {})}
              onChange={(event) => setMonth(event.target.value)}
            />
            {provider === 'nexus_fuel' && (
              <p className="text-sm text-muted">Del mes en curso se muestran los días hasta ayer.</p>
            )}
          </div>
          <Button
            variant="secondary"
            isLoading={preview.isPending}
            onClick={() => {
              const period = monthToPeriod(month);
              preview.mutate(
                { id: credential.id, ...(period ? { period } : {}) },
                {
                  onError: (error) =>
                    showToast(error instanceof ApiError ? error.message : 'No se pudo obtener la vista previa', 'danger'),
                },
              );
            }}
          >
            Ver vista previa
          </Button>
        </div>
        <Table
          columns={[
            { key: 'external', header: 'Estación recibida', render: (row) => row.externalStationId },
            { key: 'period', header: 'Periodo', render: (row) => row.period },
            { key: 'value', header: 'Valor', render: (row) => row.value },
            {
              key: 'mapped',
              header: 'En el portal',
              render: (row) =>
                row.mapped ? (
                  <Badge tone="success">{row.stationName ?? 'Ligada'}</Badge>
                ) : (
                  <Link
                    className="text-sm font-medium text-brand"
                    to={`/admin/integraciones/${provider}/mapeo?externo=${encodeURIComponent(row.externalStationId)}`}
                  >
                    Mapear
                  </Link>
                ),
            },
          ]}
          rows={preview.data?.records ?? []}
          getRowKey={(row) => `${row.externalStationId}-${row.period}-${row.value}`}
          emptyMessage="Sin vista previa"
        />
      </Card>
    </div>
  );
}
