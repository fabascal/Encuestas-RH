import { describe, expect, it } from 'vitest';
import { breakdownLevel, formatScopeLabel, stationInHierarchy } from './hierarchyFilter.js';
import type { HierarchyStation } from './hierarchyFilter.js';

const surA: HierarchyStation = { stationId: 'a', zoneId: 'sur', companyId: 'combu' };
const surB: HierarchyStation = { stationId: 'b', zoneId: 'sur', companyId: 'combu' };
const bajio: HierarchyStation = { stationId: 'c', zoneId: 'bajio', companyId: 'combu' };
const otra: HierarchyStation = { stationId: 'd', zoneId: 'norte', companyId: 'otra' };

const stations = [surA, surB, bajio, otra];
const ana = new Set(['a', 'c']);

function visible(filters: Parameters<typeof stationInHierarchy>[1], managed: ReadonlySet<string> | null = null) {
  return stations.filter((station) => stationInHierarchy(station, filters, managed)).map((station) => station.stationId);
}

describe('listScopedStations and resolveStations manager filter', () => {
  it('keeps every station in the zone when no manager is selected', () => {
    expect(visible({ zoneId: 'sur' })).toEqual(['a', 'b']);
  });

  it('keeps only that manager stations inside the selected zone', () => {
    expect(visible({ zoneId: 'sur', managerId: 'ana' }, ana)).toEqual(['a']);
  });

  it('keeps all of the manager stations when no zone is selected', () => {
    expect(visible({ managerId: 'ana' }, ana)).toEqual(['a', 'c']);
  });

  it('narrows a company to the manager stations', () => {
    expect(visible({ companyId: 'combu', managerId: 'ana' }, ana)).toEqual(['a', 'c']);
  });

  it('lets the zone win over the company, then applies the manager', () => {
    expect(visible({ companyId: 'combu', zoneId: 'bajio', managerId: 'ana' }, ana)).toEqual(['c']);
  });

  it('lets an explicit station win over the manager', () => {
    expect(visible({ zoneId: 'sur', managerId: 'ana', stationId: 'b' }, ana)).toEqual(['b']);
  });

  it('matches nothing when the manager has no stations', () => {
    expect(visible({ managerId: 'ana' }, new Set())).toEqual([]);
  });
});

describe('breakdownLevel', () => {
  it('breaks a manager selection down by station', () => {
    expect(breakdownLevel({ managerId: 'ana' }, stations)).toBe('station');
    expect(breakdownLevel({ zoneId: 'sur', managerId: 'ana' }, stations)).toBe('station');
  });

  it('keeps the station and company levels', () => {
    expect(breakdownLevel({ stationId: 'a' }, stations)).toBe('survey');
    expect(breakdownLevel({ companyId: 'combu' }, stations)).toBe('zone');
    expect(breakdownLevel({}, stations)).toBe('company');
    expect(breakdownLevel({}, [surA])).toBe('zone');
  });
});

describe('formatScopeLabel', () => {
  it('appends the manager name', () => {
    expect(formatScopeLabel('OCCIDENTE SUR', 'Ana López')).toBe('OCCIDENTE SUR · Gerente: Ana López');
    expect(formatScopeLabel('Todas las estaciones', undefined)).toBe('Todas las estaciones');
  });
});
