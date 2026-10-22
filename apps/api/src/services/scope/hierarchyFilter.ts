import type { DirectorBreakdownLevel } from '@portal/shared';

export interface HierarchySelection {
  companyId?: string | undefined;
  zoneId?: string | undefined;
  stationId?: string | undefined;
  managerId?: string | undefined;
}

export interface HierarchyStation {
  stationId: string;
  zoneId: string;
  companyId: string;
}

/**
 * Station wins. Otherwise the zone wins over the company, and a manager
 * narrows that set. listScopedStations and resolveStations apply the same rule in SQL.
 */
export function stationInHierarchy(
  station: HierarchyStation,
  filters: HierarchySelection,
  managedStationIds: ReadonlySet<string> | null,
): boolean {
  if (filters.stationId) return station.stationId === filters.stationId;
  if (filters.zoneId && station.zoneId !== filters.zoneId) return false;
  if (!filters.zoneId && filters.companyId && station.companyId !== filters.companyId) return false;
  if (managedStationIds && !managedStationIds.has(station.stationId)) return false;
  return true;
}

export function breakdownLevel(
  query: HierarchySelection,
  stations: { companyId: string }[],
): DirectorBreakdownLevel {
  if (query.stationId) return 'survey';
  if (query.zoneId || query.managerId) return 'station';
  if (query.companyId) return 'zone';
  const companies = new Set(stations.map((station) => station.companyId));
  return companies.size > 1 ? 'company' : 'zone';
}

export function formatScopeLabel(base: string, managerName: string | undefined): string {
  if (!managerName) return base;
  return `${base} · Gerente: ${managerName}`;
}
