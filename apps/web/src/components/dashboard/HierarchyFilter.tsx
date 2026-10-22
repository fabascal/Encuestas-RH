import { useCompanies, useManagers, useStations, useZones } from '../../hooks/useHierarchy';
import { Select } from '../ui/Select';

export interface HierarchyFilterProps {
  companyId: string | null;
  zoneId: string | null;
  stationId: string | null;
  onCompanyChange: (id: string | null) => void;
  onZoneChange: (id: string | null) => void;
  onStationChange: (id: string | null) => void;
  /** When set, a Gerente select is shown between Zona and Estación. */
  managerId?: string | null;
  onManagerChange?: (id: string | null) => void;
}

/** Cascading Empresa -> Zona -> Estacion selector shared by the dashboard and admin. */
export function HierarchyFilter({
  companyId,
  zoneId,
  stationId,
  onCompanyChange,
  onZoneChange,
  onStationChange,
  managerId = null,
  onManagerChange,
}: HierarchyFilterProps) {
  const showManager = onManagerChange !== undefined;
  const companiesQuery = useCompanies();
  const zonesQuery = useZones(companyId);
  const managersQuery = useManagers(companyId, zoneId, showManager);
  const stationsQuery = useStations(zoneId, showManager ? managerId : null);
  const stationEnabled = Boolean(zoneId || (showManager && managerId));

  return (
    <div className={showManager ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4' : 'grid grid-cols-1 gap-3 sm:grid-cols-3'}>
      <Select
        label="Empresa"
        placeholder="Todas las empresas"
        value={companyId ?? ''}
        onChange={(event) => onCompanyChange(event.target.value || null)}
        options={(companiesQuery.data ?? []).map((company) => ({ value: company.id, label: company.name }))}
      />
      <Select
        label="Zona"
        placeholder="Todas las zonas"
        value={zoneId ?? ''}
        onChange={(event) => onZoneChange(event.target.value || null)}
        options={(zonesQuery.data ?? []).map((zone) => ({ value: zone.id, label: zone.name }))}
      />
      {showManager && (
        <Select
          label="Gerente"
          placeholder="Todos los gerentes"
          value={managerId ?? ''}
          onChange={(event) => onManagerChange(event.target.value || null)}
          options={(managersQuery.data ?? []).map((manager) => ({ value: manager.id, label: manager.name }))}
        />
      )}
      <Select
        label="Estacion"
        placeholder={stationEnabled ? 'Selecciona una estacion' : 'Selecciona una zona primero'}
        value={stationId ?? ''}
        disabled={!stationEnabled}
        onChange={(event) => onStationChange(event.target.value || null)}
        options={(stationsQuery.data ?? []).map((station) => ({ value: station.id, label: station.name }))}
      />
    </div>
  );
}
