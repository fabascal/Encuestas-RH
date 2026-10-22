import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterContextValue {
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
  /** First day of the month, e.g. "2026-09-01". */
  period: string;
  setCompanyId: (id: string | null) => void;
  setZoneId: (id: string | null) => void;
  setManagerId: (id: string | null) => void;
  setStationId: (id: string | null) => void;
  /** Sets company, zone and station together and keeps the selected manager. */
  openStation: (selection: { companyId: string; zoneId: string; stationId: string }) => void;
  setPeriod: (period: string) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Keeps the hierarchy + period selection in the URL so links/reloads preserve context. */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const companyId = searchParams.get('companyId');
  const zoneId = searchParams.get('zoneId');
  const managerId = searchParams.get('managerId');
  const stationId = searchParams.get('stationId');
  const period = searchParams.get('period') ?? currentPeriod();

  const patch = (updates: Record<string, string | null>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const value = useMemo<FilterContextValue>(
    () => ({
      companyId,
      zoneId,
      managerId,
      stationId,
      period,
      setCompanyId: (id) => patch({ companyId: id, zoneId: null, managerId: null, stationId: null }),
      setZoneId: (id) => patch({ zoneId: id, managerId: null, stationId: null }),
      setManagerId: (id) => patch({ managerId: id, stationId: null }),
      setStationId: (id) => patch({ stationId: id }),
      openStation: (selection) =>
        patch({ companyId: selection.companyId, zoneId: selection.zoneId, stationId: selection.stationId }),
      setPeriod: (value) => patch({ period: value }),
    }),
    [companyId, zoneId, managerId, stationId, period],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within a FilterProvider');
  return context;
}
