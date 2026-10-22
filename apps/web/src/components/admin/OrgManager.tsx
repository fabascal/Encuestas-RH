import { useState } from 'react';
import type { FormEvent } from 'react';
import { Buildings, FloppyDisk, GasPump, MapTrifold, PencilSimple, Plus } from '@phosphor-icons/react';
import type { CompanyRow, StationRow, ZoneRow } from '../../hooks/useHierarchy';
import { useCompanies, useStations, useZones } from '../../hooks/useHierarchy';
import {
  useCreateCompany,
  useCreateStation,
  useCreateZone,
  useSetCompanyActive,
  useSetStationActive,
  useSetZoneActive,
  useUpdateCompany,
  useUpdateStation,
  useUpdateZone,
} from '../../hooks/useOrgAdmin';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Table } from '../ui/Table';
import { useToast } from '../ui/Toast';
import { ApiError } from '../../lib/api';

type EditTarget =
  | { kind: 'company'; row: CompanyRow }
  | { kind: 'zone'; row: ZoneRow }
  | { kind: 'station'; row: StationRow };

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-bg"
    >
      <PencilSimple size={18} />
    </button>
  );
}

function EditOrgModal({
  target,
  zones,
  onClose,
}: {
  target: EditTarget;
  zones: ZoneRow[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const updateCompany = useUpdateCompany();
  const updateZone = useUpdateZone();
  const updateStation = useUpdateStation();
  const [code, setCode] = useState(target.row.code);
  const [name, setName] = useState(target.row.name);
  const [address, setAddress] = useState(target.kind === 'station' ? (target.row.address ?? '') : '');
  const [zoneId, setZoneId] = useState(target.kind === 'station' ? target.row.zone_id : '');

  const pending = updateCompany.isPending || updateZone.isPending || updateStation.isPending;
  const title =
    target.kind === 'company' ? 'Editar empresa' : target.kind === 'zone' ? 'Editar zona' : 'Editar estación';

  const onError = (error: unknown) => {
    showToast(error instanceof ApiError ? error.message : 'Ocurrió un error inesperado', 'danger');
  };

  const save = () => {
    const payload = { code: code.trim(), name: name.trim() };
    if (target.kind === 'company') {
      updateCompany.mutate(
        { id: target.row.id, ...payload },
        { onSuccess: () => { showToast('Empresa actualizada', 'success'); onClose(); }, onError },
      );
      return;
    }
    if (target.kind === 'zone') {
      updateZone.mutate(
        { id: target.row.id, ...payload },
        { onSuccess: () => { showToast('Zona actualizada', 'success'); onClose(); }, onError },
      );
      return;
    }
    updateStation.mutate(
      {
        id: target.row.id,
        ...payload,
        address: address.trim() === '' ? null : address.trim(),
        zoneId,
      },
      { onSuccess: () => { showToast('Estación actualizada', 'success'); onClose(); }, onError },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button isLoading={pending} onClick={save}>
            <FloppyDisk size={18} aria-hidden />
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label="Código" required value={code} onChange={(event) => setCode(event.target.value)} />
        <Input label="Nombre" required value={name} onChange={(event) => setName(event.target.value)} />
        {target.kind === 'station' && (
          <>
            <Input label="Dirección" value={address} onChange={(event) => setAddress(event.target.value)} />
            <Select
              label="Zona"
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              options={zones.map((zone) => ({ value: zone.id, label: `${zone.name} (${zone.code})` }))}
            />
            <p className="text-sm text-muted">
              Si cambias el código, Nexus deja de reconocer la estación hasta que coincida con el código del reporte, por ejemplo 7846. Las ventas y los bonos ya guardados no se pierden.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

export function OrgManager() {
  const { showToast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const companiesQuery = useCompanies();
  const zonesQuery = useZones(selectedCompanyId);
  const stationsQuery = useStations(selectedZoneId);

  const createCompany = useCreateCompany();
  const setCompanyActive = useSetCompanyActive();
  const createZone = useCreateZone();
  const setZoneActive = useSetZoneActive();
  const createStation = useCreateStation();
  const setStationActive = useSetStationActive();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [stationSearch, setStationSearch] = useState('');

  const [companyForm, setCompanyForm] = useState({ code: '', name: '' });
  const [zoneForm, setZoneForm] = useState({ code: '', name: '' });
  const [stationForm, setStationForm] = useState({ code: '', name: '', address: '' });

  const onError = (error: unknown) => {
    showToast(error instanceof ApiError ? error.message : 'Ocurrió un error inesperado', 'danger');
  };

  const submitCompany = (event: FormEvent) => {
    event.preventDefault();
    createCompany.mutate(companyForm, {
      onSuccess: () => {
        setCompanyForm({ code: '', name: '' });
        showToast('Empresa creada', 'success');
      },
      onError,
    });
  };

  const submitZone = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCompanyId) return;
    createZone.mutate(
      { ...zoneForm, companyId: selectedCompanyId },
      {
        onSuccess: () => {
          setZoneForm({ code: '', name: '' });
          showToast('Zona creada', 'success');
        },
        onError,
      },
    );
  };

  const submitStation = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedZoneId) return;
    createStation.mutate(
      { ...stationForm, address: stationForm.address || undefined, zoneId: selectedZoneId },
      {
        onSuccess: () => {
          setStationForm({ code: '', name: '', address: '' });
          showToast('Estación creada', 'success');
        },
        onError,
      },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle icon={<IconTile icon={Buildings} size="sm" />}>Empresas</CardTitle>
        </CardHeader>
        <form onSubmit={submitCompany} className="mb-4 flex flex-col gap-3">
          <Input
            label="Código"
            required
            value={companyForm.code}
            onChange={(e) => setCompanyForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Input
            label="Nombre"
            required
            value={companyForm.name}
            onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Button type="submit" isLoading={createCompany.isPending} size="sm">
            <Plus size={16} aria-hidden />
            Agregar empresa
          </Button>
        </form>
        <Table
          columns={[
            {
              key: 'name',
              header: 'Empresa',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId(row.id);
                    setSelectedZoneId(null);
                  }}
                  className={`text-left ${selectedCompanyId === row.id ? 'font-semibold text-brand' : ''}`}
                >
                  {row.name} <span className="text-muted">({row.code})</span>
                </button>
              ),
            },
            {
              key: 'active',
              header: 'Activa',
              render: (row) => (
                <Switch
                  checked={row.active}
                  onChange={(active) => setCompanyActive.mutate({ id: row.id, active }, { onError })}
                />
              ),
            },
            {
              key: 'edit',
              header: '',
              render: (row) => (
                <EditButton label={`Editar ${row.name}`} onClick={() => setEditing({ kind: 'company', row })} />
              ),
            },
          ]}
          rows={companiesQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Sin empresas registradas"
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={<IconTile icon={MapTrifold} size="sm" />}>Zonas</CardTitle>
        </CardHeader>
        {!selectedCompanyId ? (
          <p className="text-sm text-muted">Selecciona una empresa para ver sus zonas.</p>
        ) : (
          <>
            <form onSubmit={submitZone} className="mb-4 flex flex-col gap-3">
              <Input
                label="Código"
                required
                value={zoneForm.code}
                onChange={(e) => setZoneForm((f) => ({ ...f, code: e.target.value }))}
              />
              <Input
                label="Nombre"
                required
                value={zoneForm.name}
                onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Button type="submit" isLoading={createZone.isPending} size="sm">
                <Plus size={16} aria-hidden />
                Agregar zona
              </Button>
            </form>
            <Table
              columns={[
                {
                  key: 'name',
                  header: 'Zona',
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedZoneId(row.id);
                        setStationSearch('');
                      }}
                      className={`text-left ${selectedZoneId === row.id ? 'font-semibold text-brand' : ''}`}
                    >
                      {row.name} <span className="text-muted">({row.code})</span>
                    </button>
                  ),
                },
                {
                  key: 'active',
                  header: 'Activa',
                  render: (row) => (
                    <Switch
                      checked={row.active}
                      onChange={(active) => setZoneActive.mutate({ id: row.id, active }, { onError })}
                    />
                  ),
                },
                {
                  key: 'edit',
                  header: '',
                  render: (row) => (
                    <EditButton label={`Editar ${row.name}`} onClick={() => setEditing({ kind: 'zone', row })} />
                  ),
                },
              ]}
              rows={zonesQuery.data ?? []}
              getRowKey={(row) => row.id}
              emptyMessage="Sin zonas registradas"
            />
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={<IconTile icon={GasPump} size="sm" />}>Estaciones</CardTitle>
        </CardHeader>
        {!selectedZoneId ? (
          <p className="text-sm text-muted">Selecciona una zona para ver sus estaciones.</p>
        ) : (
          <>
            <Input
              label="Buscar estación"
              value={stationSearch}
              onChange={(event) => setStationSearch(event.target.value)}
              placeholder="Nombre o código"
            />
            <form onSubmit={submitStation} className="mb-4 flex flex-col gap-3">
              <Input
                label="Código"
                required
                value={stationForm.code}
                onChange={(e) => setStationForm((f) => ({ ...f, code: e.target.value }))}
              />
              <Input
                label="Nombre"
                required
                value={stationForm.name}
                onChange={(e) => setStationForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Dirección (opcional)"
                value={stationForm.address}
                onChange={(e) => setStationForm((f) => ({ ...f, address: e.target.value }))}
              />
              <Button type="submit" isLoading={createStation.isPending} size="sm">
                <Plus size={16} aria-hidden />
                Agregar estación
              </Button>
            </form>
            <Table
              columns={[
                { key: 'name', header: 'Estacion', render: (row) => `${row.name} (${row.code})` },
                {
                  key: 'active',
                  header: 'Activa',
                  render: (row) => (
                    <Switch
                      checked={row.active}
                      onChange={(active) => setStationActive.mutate({ id: row.id, active }, { onError })}
                    />
                  ),
                },
                {
                  key: 'edit',
                  header: '',
                  render: (row) => (
                    <EditButton label={`Editar ${row.name}`} onClick={() => setEditing({ kind: 'station', row })} />
                  ),
                },
              ]}
              rows={(stationsQuery.data ?? []).filter((row) => {
                const query = stationSearch.trim().toLowerCase();
                if (!query) return true;
                return row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query);
              })}
              getRowKey={(row) => row.id}
              emptyMessage="Sin estaciones registradas"
            />
          </>
        )}
      </Card>
      {editing && (
        <EditOrgModal
          key={editing.row.id}
          target={editing}
          zones={zonesQuery.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
