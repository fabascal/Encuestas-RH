import type { DirectorBreakdownLevel } from '../direccion/types.js';

export interface OilDay {
  day: string;
  /** Null on days that have not happened yet. Zero when the day passed without a sale. */
  value: number | null;
}

export interface StationOilMonth {
  mode: 'station';
  period: string;
  stationId: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  companyId: string;
  companyName: string;
  actual: number;
  target: number | null;
  progress: number | null;
  expectedByNow: number | null;
  dailyNeeded: number | null;
  projection: number | null;
  projectedProgress: number | null;
  daysElapsed: number;
  daysInMonth: number;
  days: OilDay[];
}

export interface GroupOilRow {
  stationId: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  companyId: string;
  companyName: string;
  actual: number;
  target: number | null;
  progress: number | null;
  projection: number | null;
  projectedProgress: number | null;
}

export interface GroupOilMonth {
  mode: 'group';
  period: string;
  scopeLabel: string;
  /** Sales of every station in the scope, including those without a target. */
  actual: number;
  /** Sales that count toward the goal: stations with a target. */
  measured: number;
  target: number | null;
  progress: number | null;
  projection: number | null;
  projectedProgress: number | null;
  rows: GroupOilRow[];
}

export type PanelOil = StationOilMonth | GroupOilMonth;

export interface DirectorOilMonth {
  month: number;
  actual: number | null;
  target: number | null;
  progress: number | null;
}

export interface DirectorOilBreakdown {
  id: string;
  label: string;
  actual: number;
  target: number | null;
  progress: number | null;
  months: Array<number | null>;
}

export interface DirectorOilRank {
  stationId: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  companyId: string;
  actual: number;
  target: number | null;
  progress: number | null;
}

export interface DirectorOil {
  year: number;
  level: DirectorBreakdownLevel;
  scopeLabel: string;
  hasTargets: boolean;
  /** Month used for "this month" (1-12). Null when the year has not started. */
  referenceMonth: number | null;
  totals: {
    actual: number;
    measured: number;
    target: number | null;
    progress: number | null;
    onGoal: number;
    stations: number;
    strongest: { month: number; progress: number | null; actual: number } | null;
    weakest: { month: number; progress: number | null; actual: number } | null;
  };
  monthly: DirectorOilMonth[];
  breakdown: DirectorOilBreakdown[];
  farthest: DirectorOilRank[];
  best: DirectorOilRank[];
}
