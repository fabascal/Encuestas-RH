import type { Icon } from '@phosphor-icons/react';
import {
  ArrowsClockwise,
  Buildings,
  CalendarBlank,
  ChatText,
  ClipboardText,
  Clock,
  ClockCounterClockwise,
  Drop,
  Flask,
  GasPump,
  GridFour,
  IdentificationCard,
  LinkSimple,
  Money,
  PencilLine,
  Plug,
  PlugsConnected,
  PresentationChart,
  ShieldCheck,
  Sliders,
  Target,
  TrendUp,
  UserMinus,
  Users,
} from '@phosphor-icons/react';
import type { IntegrationProvider, ReportId } from '@portal/shared';

export const KPI_ICONS: Record<string, Icon> = {
  oil_sales: Drop,
  punctuality: Clock,
  staff_turnover: UserMinus,
  sispa_compliance: ShieldCheck,
  survey_score: ClipboardText,
  open_dispensers: GasPump,
};

export function kpiIcon(code: string): Icon {
  return KPI_ICONS[code] ?? Target;
}

export const REPORT_ICONS: Record<ReportId, Icon> = {
  resumen: PresentationChart,
  cumplimiento: GridFour,
  pagos: Money,
  tendencia: TrendUp,
  estacion: GasPump,
  encuestas: ClipboardText,
};

export const PROVIDER_ICONS: Record<IntegrationProvider, Icon> = {
  nexus_fuel: Drop,
  google_forms: ClipboardText,
  sispa: ShieldCheck,
  nomina3: Users,
};

export const ADMIN_ICONS = {
  organizacion: Buildings,
  usuarios: Users,
  roles: IdentificationCard,
  reglas: Sliders,
  captura: PencilLine,
  integraciones: PlugsConnected,
} as const;

export const INTEGRATION_TAB_ICONS = {
  conexion: Plug,
  prueba: Flask,
  sincronizar: ArrowsClockwise,
  calendario: CalendarBlank,
  respuestas: ChatText,
  mapeo: LinkSimple,
  historial: ClockCounterClockwise,
} as const;
