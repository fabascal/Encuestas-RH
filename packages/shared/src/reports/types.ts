export type ReportSource = 'cerrado' | 'estimado';
export type HeatLevel = 'meta' | 'cerca' | 'lejos' | 'sin_dato';
export type TrendDirection = 'sube' | 'baja' | 'igual' | 'sin_dato';
export type SurveyBand = 'bajo' | 'medio' | 'alto';

export interface ReportHeader {
  period: string;
  generatedAt: string;
  generatedBy: string;
  scopeLabel: string;
  source: ReportSource;
}

export interface ZonePaidBar {
  zoneName: string;
  poolAmount: number;
  totalPayout: number;
  paidPct: number | null;
}

export interface RankedStation {
  stationId: string;
  stationName: string;
  stationCode: string;
  zoneName: string;
  paidPct: number | null;
  totalPayout: number;
}

export interface LostKpi {
  kpiCode: string;
  kpiName: string;
  lostAmount: number;
}

export interface SummaryReport extends ReportHeader {
  previousPeriod: string;
  poolAmount: number;
  totalPayout: number;
  paidPct: number | null;
  previousPaidPct: number | null;
  paidPctChange: number | null;
  stationsOnGoal: number;
  stationsConfigured: number;
  stationsWithoutRules: number;
  zones: ZonePaidBar[];
  best: RankedStation[];
  worst: RankedStation[];
  lostByKpi: LostKpi[];
}

export interface ComplianceKpi {
  kpiCode: string;
  kpiName: string;
}

export interface ComplianceCell {
  kpiCode: string;
  progressPct: number | null;
  level: HeatLevel;
}

export interface ComplianceRow {
  stationId: string;
  stationName: string;
  stationCode: string;
  zoneName: string;
  cells: ComplianceCell[];
}

export interface ComplianceReport extends ReportHeader {
  kpis: ComplianceKpi[];
  rows: ComplianceRow[];
  totals: ComplianceCell[];
}

export interface PayoutRow {
  stationId: string;
  stationCode: string;
  stationName: string;
  zoneName: string;
  companyName: string;
  configured: boolean;
  source: ReportSource;
  poolAmount: number;
  totalPayout: number;
  paidPct: number | null;
}

export interface PayoutsReport extends ReportHeader {
  periodStatus: 'open' | 'closed';
  rows: PayoutRow[];
  totalPool: number;
  totalPayout: number;
}

export interface TrendPoint {
  period: string;
  paidPct: number | null;
}

export interface TrendKpiSeries {
  kpiCode: string;
  kpiName: string;
  points: Array<{ period: string; averageProgressPct: number | null }>;
}

export interface TrendStation {
  stationId: string;
  stationName: string;
  stationCode: string;
  zoneName: string;
  points: TrendPoint[];
  direction: TrendDirection;
}

export interface TrendReport {
  generatedAt: string;
  generatedBy: string;
  scopeLabel: string;
  months: string[];
  network: TrendPoint[];
  kpis: TrendKpiSeries[];
  stations: TrendStation[];
}

export interface StationLine {
  kpiCode: string;
  kpiName: string;
  actualValue: number;
  targetValue: number;
  progressPct: number | null;
  /** Positive means the station still has to improve. */
  gap: number | null;
  higherIsBetter: boolean;
  payout: number;
  level: HeatLevel;
}

export interface OilPace {
  target: number | null;
  actual: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyNeeded: number | null;
  expectedByNow: number | null;
  days: Array<{ day: string; value: number }>;
}

export interface StationSurvey {
  submittedAt: string;
  email: string | null;
  score: number | null;
}

export interface StationHistoryPoint {
  period: string;
  paidPct: number | null;
  totalPayout: number;
}

export interface StationReport extends ReportHeader {
  stationId: string;
  stationCode: string;
  stationName: string;
  zoneName: string;
  companyName: string;
  configured: boolean;
  poolAmount: number;
  totalPayout: number;
  lines: StationLine[];
  history: StationHistoryPoint[];
  oil: OilPace | null;
  surveys: StationSurvey[];
}

export interface SurveyStationRow {
  stationId: string;
  stationName: string;
  stationCode: string;
  zoneName: string;
  responses: number;
  average: number | null;
}

export interface SurveyDetail {
  stationName: string;
  zoneName: string;
  submittedAt: string;
  email: string | null;
  score: number | null;
  band: SurveyBand | null;
  excluded: boolean;
}

export interface SurveysReport {
  period: string;
  generatedAt: string;
  generatedBy: string;
  scopeLabel: string;
  responseCount: number;
  stationCount: number;
  average: number | null;
  bands: Record<SurveyBand, number>;
  stations: SurveyStationRow[];
  missing: Array<{ stationId: string; stationName: string; stationCode: string; zoneName: string }>;
  details: SurveyDetail[];
}
