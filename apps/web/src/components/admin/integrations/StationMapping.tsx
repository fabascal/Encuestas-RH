import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IntegrationProvider } from '@portal/shared';
import { useAllStations } from '../../../hooks/useHierarchy';
import { useCreateStationRef, useDeleteStationRef, useStationRefs } from '../../../hooks/useIntegrations';
import { ApiError } from '../../../lib/api';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Table } from '../../ui/Table';
import { useToast } from '../../ui/Toast';

export function StationMapping({ provider }: { provider: IntegrationProvider }) {
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const refsQuery = useStationRefs(provider);
  const stationsQuery = useAllStations();
  const createRef = useCreateStationRef(provider);
  const deleteRef = useDeleteStationRef(provider);
  const [externalId, setExternalId] = useState(params.get('externo') ?? '');
  const [stationId, setStationId] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createRef.mutate(
      { externalId, stationId },
      {
        onSuccess: () => {
          showToast('Estación ligada', 'success');
          setExternalId('');
          setStationId('');
        },
        onError: (error) => showToast(error instanceof ApiError ? error.message : 'No se pudo ligar la estación', 'danger'),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapeo de estaciones</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          label="Identificador externo"
          required
          value={externalId}
          hint={
            provider === 'google_forms'
              ? 'El nombre tal como llega, por ejemplo 8 de julio'
              : provider === 'nexus_fuel'
                ? 'El código de la estación, por ejemplo 7846. Si ya coincide con el portal, no hace falta ligarla.'
                : 'El identificador que envía el sistema externo'
          }
          onChange={(event) => setExternalId(event.target.value)}
        />
        <Select
          label="Estación del portal"
          required
          placeholder="Selecciona"
          value={stationId}
          options={(stationsQuery.data ?? []).map((station) => ({ value: station.id, label: station.name }))}
          onChange={(event) => setStationId(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" isLoading={createRef.isPending}>
            Ligar
          </Button>
        </div>
      </form>
      <Table
        columns={[
          { key: 'external', header: 'Identificador externo', render: (row) => row.external_id },
          { key: 'station', header: 'Estación del portal', render: (row) => row.station_name },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  deleteRef.mutate(row.id, {
                    onError: (error) =>
                      showToast(error instanceof ApiError ? error.message : 'No se pudo quitar el vínculo', 'danger'),
                  })
                }
              >
                Quitar
              </Button>
            ),
          },
        ]}
        rows={refsQuery.data ?? []}
        getRowKey={(row) => row.id}
        emptyMessage="Sin estaciones ligadas"
      />
    </Card>
  );
}
