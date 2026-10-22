import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { UserScopeInput } from '@portal/shared';
import { useCompanies, useZones, useAllStations } from '../../../hooks/useHierarchy';
import type { CompanyRow, StationRow, ZoneRow } from '../../../hooks/useHierarchy';
import { useStationManagers } from '../../../hooks/useUsers';
import type { UserScopeRow } from '../../../hooks/useUsers';
import { Input } from '../../ui/Input';

export function keysFromScopes(scopes: UserScopeRow[]): Set<string> {
  const keys = new Set<string>();
  for (const scope of scopes) {
    if (scope.company_id) keys.add(`company:${scope.company_id}`);
    else if (scope.zone_id) keys.add(`zone:${scope.zone_id}`);
    else if (scope.station_id) keys.add(`station:${scope.station_id}`);
  }
  return keys;
}

export function scopesFromKeys(keys: Iterable<string>): UserScopeInput[] {
  const scopes: UserScopeInput[] = [];
  for (const key of keys) {
    const split = key.indexOf(':');
    const level = key.slice(0, split);
    const id = key.slice(split + 1);
    if (!id) continue;
    if (level === 'company') scopes.push({ companyId: id, zoneId: null, stationId: null });
    else if (level === 'zone') scopes.push({ companyId: null, zoneId: id, stationId: null });
    else if (level === 'station') scopes.push({ companyId: null, zoneId: null, stationId: id });
  }
  return scopes;
}

export function stationKeysOnly(keys: Set<string>): Set<string> {
  return new Set([...keys].filter((key) => key.startsWith('station:')));
}

interface ScopePickerProps {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  stationOnly: boolean;
  currentUserId: string | null;
}

interface Catalog {
  companies: CompanyRow[];
  zonesByCompany: Map<string, ZoneRow[]>;
  stationsByZone: Map<string, StationRow[]>;
  zoneById: Map<string, ZoneRow>;
  companyById: Map<string, CompanyRow>;
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function byName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name, 'es');
}

function coversStation(keys: Set<string>, station: StationRow, zone: ZoneRow): boolean {
  return keys.has(`station:${station.id}`) || keys.has(`zone:${zone.id}`) || keys.has(`company:${zone.company_id}`);
}

function toggleCompany(keys: Set<string>, companyId: string, catalog: Catalog, stationOnly: boolean, blocked: Set<string>): Set<string> {
  const next = new Set(keys);
  const zones = catalog.zonesByCompany.get(companyId) ?? [];
  const stations = zones.flatMap((zone) => catalog.stationsByZone.get(zone.id) ?? []);
  if (stationOnly) {
    const free = stations.filter((station) => !blocked.has(station.id));
    const allOn = free.length > 0 && free.every((station) => next.has(`station:${station.id}`));
    for (const station of free) {
      if (allOn) next.delete(`station:${station.id}`);
      else next.add(`station:${station.id}`);
    }
    return next;
  }
  if (next.has(`company:${companyId}`)) {
    next.delete(`company:${companyId}`);
    return next;
  }
  next.add(`company:${companyId}`);
  for (const zone of zones) next.delete(`zone:${zone.id}`);
  for (const station of stations) next.delete(`station:${station.id}`);
  return next;
}

function toggleZone(keys: Set<string>, zone: ZoneRow, catalog: Catalog, stationOnly: boolean, blocked: Set<string>): Set<string> {
  const next = new Set(keys);
  const stations = catalog.stationsByZone.get(zone.id) ?? [];
  if (stationOnly) {
    const free = stations.filter((station) => !blocked.has(station.id));
    const allOn = free.length > 0 && free.every((station) => next.has(`station:${station.id}`));
    for (const station of free) {
      if (allOn) next.delete(`station:${station.id}`);
      else next.add(`station:${station.id}`);
    }
    return next;
  }
  if (next.has(`company:${zone.company_id}`)) {
    next.delete(`company:${zone.company_id}`);
    for (const sibling of catalog.zonesByCompany.get(zone.company_id) ?? []) {
      if (sibling.id !== zone.id) next.add(`zone:${sibling.id}`);
    }
    return next;
  }
  if (next.has(`zone:${zone.id}`)) {
    next.delete(`zone:${zone.id}`);
    for (const station of stations) next.delete(`station:${station.id}`);
    return next;
  }
  next.add(`zone:${zone.id}`);
  for (const station of stations) next.delete(`station:${station.id}`);
  return next;
}

function toggleStation(keys: Set<string>, station: StationRow, zone: ZoneRow, catalog: Catalog, stationOnly: boolean, blocked: Set<string>): Set<string> {
  const next = new Set(keys);
  if (stationOnly) {
    if (blocked.has(station.id)) return next;
    const key = `station:${station.id}`;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }
  if (next.has(`station:${station.id}`)) {
    next.delete(`station:${station.id}`);
    return next;
  }
  const stations = catalog.stationsByZone.get(zone.id) ?? [];
  if (next.has(`zone:${zone.id}`)) {
    next.delete(`zone:${zone.id}`);
    for (const other of stations) {
      if (other.id !== station.id) next.add(`station:${other.id}`);
    }
    return next;
  }
  if (next.has(`company:${zone.company_id}`)) {
    next.delete(`company:${zone.company_id}`);
    for (const sibling of catalog.zonesByCompany.get(zone.company_id) ?? []) {
      if (sibling.id !== zone.id) next.add(`zone:${sibling.id}`);
    }
    for (const other of stations) {
      if (other.id !== station.id) next.add(`station:${other.id}`);
    }
    return next;
  }
  next.add(`station:${station.id}`);
  return next;
}

function Check({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);

  return (
    <label className={`flex min-w-0 flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-brand"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="min-w-0 truncate text-sm text-fg">{label}</span>
      {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function ScopePicker({ value, onChange, stationOnly, currentUserId }: ScopePickerProps) {
  const companiesQuery = useCompanies();
  const zonesQuery = useZones(null);
  const stationsQuery = useAllStations();
  const managersQuery = useStationManagers();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [primed, setPrimed] = useState(false);
  const [showAllChips, setShowAllChips] = useState(false);

  const managers = useMemo(() => {
    const map = new Map<string, { userId: string; fullName: string }>();
    for (const row of managersQuery.data ?? []) map.set(row.stationId, row);
    return map;
  }, [managersQuery.data]);

  const blocked = useMemo(() => {
    const ids = new Set<string>();
    for (const [stationId, manager] of managers) {
      if (manager.userId !== currentUserId) ids.add(stationId);
    }
    return ids;
  }, [managers, currentUserId]);

  const catalog = useMemo<Catalog>(() => {
    const selectedIds = new Set(
      [...value].flatMap((key) => (key.startsWith('station:') ? [key.slice('station:'.length)] : [])),
    );
    const stations = (stationsQuery.data ?? [])
      .filter((station) => station.active || selectedIds.has(station.id))
      .slice()
      .sort(byName);
    const zones = (zonesQuery.data ?? []).filter((zone) => zone.active).slice().sort(byName);
    const companies = (companiesQuery.data ?? []).filter((company) => company.active).slice().sort(byName);
    const stationsByZone = new Map<string, StationRow[]>();
    for (const station of stations) {
      const list = stationsByZone.get(station.zone_id) ?? [];
      list.push(station);
      stationsByZone.set(station.zone_id, list);
    }
    const zonesByCompany = new Map<string, ZoneRow[]>();
    const zoneById = new Map<string, ZoneRow>();
    for (const zone of zones) {
      if ((stationsByZone.get(zone.id) ?? []).length === 0 && !value.has(`zone:${zone.id}`)) continue;
      const list = zonesByCompany.get(zone.company_id) ?? [];
      list.push(zone);
      zonesByCompany.set(zone.company_id, list);
      zoneById.set(zone.id, zone);
    }
    const companyById = new Map(companies.map((company) => [company.id, company]));
    return { companies, zonesByCompany, stationsByZone, zoneById, companyById };
  }, [companiesQuery.data, zonesQuery.data, stationsQuery.data, value]);

  useEffect(() => {
    if (primed || catalog.zoneById.size === 0) return;
    const next = new Set<string>();
    for (const [zoneId, zone] of catalog.zoneById) {
      const stations = catalog.stationsByZone.get(zoneId) ?? [];
      if (!stations.some((station) => coversStation(value, station, zone)) && !value.has(`zone:${zoneId}`)) {
        next.add(`zone:${zoneId}`);
      }
    }
    setClosed(next);
    setPrimed(true);
  }, [primed, catalog, value]);

  const needle = fold(query.trim());

  const chips = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    for (const key of value) {
      const id = key.slice(key.indexOf(':') + 1);
      if (key.startsWith('company:')) {
        const company = catalog.companyById.get(id);
        if (company) items.push({ key, label: company.name });
      } else if (key.startsWith('zone:')) {
        const zone = catalog.zoneById.get(id);
        if (zone) items.push({ key, label: zone.name });
      } else if (key.startsWith('station:')) {
        const station = (stationsQuery.data ?? []).find((item) => item.id === id);
        if (station) items.push({ key, label: station.name });
      }
    }
    return items.sort((left, right) => left.label.localeCompare(right.label, 'es'));
  }, [value, catalog, stationsQuery.data]);

  const covered = useMemo(() => {
    const zoneNames = new Set<string>();
    let count = 0;
    for (const zone of catalog.zoneById.values()) {
      const stations = catalog.stationsByZone.get(zone.id) ?? [];
      const chosen = stations.filter((station) => coversStation(value, station, zone));
      if (chosen.length > 0) zoneNames.add(zone.name);
      count += chosen.length;
    }
    return { count, zones: [...zoneNames] };
  }, [catalog, value]);

  const summary = (() => {
    if (covered.count === 0) return 'Ninguna estación seleccionada';
    const stations = covered.count === 1 ? '1 estación' : `${covered.count} estaciones`;
    const zone = covered.zones[0];
    if (covered.zones.length === 1 && zone) return `${stations} en ${zone}`;
    if (covered.zones.length > 1) return `${stations} en ${covered.zones.length} zonas`;
    return stations;
  })();

  const visibleChips = showAllChips ? chips : chips.slice(0, 10);
  const loading = companiesQuery.isLoading || zonesQuery.isLoading || stationsQuery.isLoading;

  const removeChip = (key: string) => {
    const id = key.slice(key.indexOf(':') + 1);
    if (key.startsWith('company:')) onChange(toggleCompany(value, id, catalog, stationOnly, blocked));
    else if (key.startsWith('zone:')) {
      const zone = catalog.zoneById.get(id);
      if (zone) onChange(toggleZone(value, zone, catalog, stationOnly, blocked));
    } else if (key.startsWith('station:')) {
      const station = (stationsQuery.data ?? []).find((item) => item.id === id);
      const zone = station ? catalog.zoneById.get(station.zone_id) : undefined;
      if (station && zone) onChange(toggleStation(value, station, zone, catalog, stationOnly, blocked));
    }
  };

  const toggleClosed = (key: string) => {
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-fg">Alcance de acceso</p>
        <p className="text-sm text-muted">{summary}</p>
        {stationOnly && (
          <p className="text-xs text-muted">Un gerente de estación se asigna solo a estaciones. Cada estación tiene un solo gerente.</p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleChips.map((chip) => (
            <span key={chip.key} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-soft py-1 pr-1 pl-2.5 text-xs font-medium text-brand">
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                aria-label={`Quitar ${chip.label}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand hover:text-on-brand"
                onClick={() => removeChip(chip.key)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {chips.length > 10 && (
            <button type="button" className="px-2 text-xs font-medium text-brand hover:underline" onClick={() => setShowAllChips((open) => !open)}>
              {showAllChips ? 'Ver menos' : `Ver todas (${chips.length})`}
            </button>
          )}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-surface pb-1">
        <Input
          id={searchId}
          label="Buscar"
          placeholder="Buscar estación o zona"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<MagnifyingGlass size={16} />}
        />
      </div>

      {loading && <p className="text-sm text-muted">Cargando estaciones…</p>}

      <div className="flex flex-col gap-2">
        {catalog.companies.map((company) => {
          const zones = catalog.zonesByCompany.get(company.id) ?? [];
          const visibleZones = zones.filter((zone) => {
            if (!needle) return true;
            if (fold(company.name).includes(needle) || fold(zone.name).includes(needle)) return true;
            return (catalog.stationsByZone.get(zone.id) ?? []).some((station) => fold(station.name).includes(needle));
          });
          if (visibleZones.length === 0) return null;
          const companyStations = zones.flatMap((zone) => catalog.stationsByZone.get(zone.id) ?? []);
          const companyChosen = companyStations.filter((station) => {
            const zone = catalog.zoneById.get(station.zone_id);
            return zone ? coversStation(value, station, zone) : false;
          });
          const companyFree = companyStations.filter((station) => !blocked.has(station.id));
          const companyOpen = needle ? true : !closed.has(`company:${company.id}`);
          const companyChecked = stationOnly
            ? companyFree.length > 0 && companyFree.every((station) => value.has(`station:${station.id}`))
            : value.has(`company:${company.id}`);
          const companyMixed = stationOnly
            ? !companyChecked && companyFree.some((station) => value.has(`station:${station.id}`))
            : !companyChecked && companyChosen.length > 0;

          return (
            <section key={company.id} className="rounded-card border border-border">
              <div className="flex items-center gap-1 px-2 py-2">
                <button
                  type="button"
                  aria-expanded={companyOpen}
                  aria-label={companyOpen ? `Cerrar ${company.name}` : `Abrir ${company.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-bg"
                  onClick={() => toggleClosed(`company:${company.id}`)}
                >
                  <CaretRight size={14} className={companyOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
                </button>
                <Check
                  checked={companyChecked}
                  indeterminate={companyMixed}
                  label={company.name}
                  hint={`${companyChosen.length} de ${companyStations.length}`}
                  onChange={() => onChange(toggleCompany(value, company.id, catalog, stationOnly, blocked))}
                />
              </div>
              {companyOpen && (
                <div className="flex flex-col gap-1 border-t border-border px-2 py-2">
                  {visibleZones.map((zone) => {
                    const stations = catalog.stationsByZone.get(zone.id) ?? [];
                    const zoneMatches = !needle || fold(zone.name).includes(needle) || fold(company.name).includes(needle);
                    const visibleStations = zoneMatches
                      ? stations
                      : stations.filter((station) => fold(station.name).includes(needle));
                    const chosen = stations.filter((station) => coversStation(value, station, zone));
                    const free = stations.filter((station) => !blocked.has(station.id));
                    const zoneOpen = needle ? true : !closed.has(`zone:${zone.id}`);
                    const inherited = !stationOnly && (value.has(`zone:${zone.id}`) || value.has(`company:${company.id}`));
                    const zoneChecked = stationOnly
                      ? free.length > 0 && free.every((station) => value.has(`station:${station.id}`))
                      : inherited;
                    const zoneMixed = stationOnly
                      ? !zoneChecked && free.some((station) => value.has(`station:${station.id}`))
                      : !zoneChecked && chosen.length > 0;

                    return (
                      <div key={zone.id}>
                        <div className="flex items-center gap-1 pl-4">
                          <button
                            type="button"
                            aria-expanded={zoneOpen}
                            aria-label={zoneOpen ? `Cerrar ${zone.name}` : `Abrir ${zone.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-bg"
                            onClick={() => toggleClosed(`zone:${zone.id}`)}
                          >
                            <CaretRight size={14} className={zoneOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
                          </button>
                          <Check
                            checked={zoneChecked}
                            indeterminate={zoneMixed}
                            label={zone.name}
                            hint={`${chosen.length} de ${stations.length}`}
                            onChange={() => onChange(toggleZone(value, zone, catalog, stationOnly, blocked))}
                          />
                        </div>
                        {zoneOpen && (
                          <ul className="flex flex-col py-1 pl-14">
                            {visibleStations.map((station) => {
                              const manager = managers.get(station.id);
                              const taken = Boolean(manager && manager.userId !== currentUserId);
                              const checked = coversStation(value, station, zone);
                              let hint: string | undefined;
                              if (taken && manager) hint = `Gerente: ${manager.fullName}`;
                              else if (!stationOnly && value.has(`company:${company.id}`) && !value.has(`station:${station.id}`)) {
                                hint = 'Incluida por la empresa';
                              } else if (!stationOnly && value.has(`zone:${zone.id}`) && !value.has(`station:${station.id}`)) {
                                hint = 'Incluida por la zona';
                              }
                              return (
                                <li key={station.id} className="py-1">
                                  <Check
                                    checked={checked}
                                    disabled={taken}
                                    label={station.name}
                                    {...(hint ? { hint } : {})}
                                    onChange={() => onChange(toggleStation(value, station, zone, catalog, stationOnly, blocked))}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {!loading && needle && catalog.companies.every((company) => {
          const zones = catalog.zonesByCompany.get(company.id) ?? [];
          return zones.every((zone) => {
            const zoneHit = fold(zone.name).includes(needle) || fold(company.name).includes(needle);
            const stationHit = (catalog.stationsByZone.get(zone.id) ?? []).some((station) => fold(station.name).includes(needle));
            return !zoneHit && !stationHit;
          });
        }) && <p className="text-sm text-muted">No hay estaciones con ese nombre.</p>}
      </div>
    </div>
  );
}
