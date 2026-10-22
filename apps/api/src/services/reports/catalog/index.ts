import type { ReportId, ReportQuery } from '@portal/shared';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import * as compliance from './compliance.js';
import * as payouts from './payouts.js';
import * as station from './station.js';
import * as summary from './summary.js';
import * as surveys from './surveys.js';
import * as trend from './trend.js';

interface ReportModule {
  build: (user: AuthUser, query: ReportQuery) => Promise<unknown>;
  pdf: (data: never) => Promise<Buffer>;
  excel: (data: never) => Promise<Buffer>;
}

export const REPORTS: Record<ReportId, ReportModule> = {
  resumen: summary,
  cumplimiento: compliance,
  pagos: payouts,
  tendencia: trend,
  estacion: station,
  encuestas: surveys,
};
