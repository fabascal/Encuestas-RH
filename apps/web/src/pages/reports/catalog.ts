import type { ReportId } from '@portal/shared';

export interface ReportCard {
  id: ReportId;
  title: string;
  audience: string;
  description: string;
  months: boolean;
  needsStation: boolean;
}

export const REPORT_CATALOG: ReportCard[] = [
  {
    id: 'resumen',
    title: 'Resumen ejecutivo',
    audience: 'Dirección y gerentes de zona',
    description: 'Cuánto de la bolsa se está pagando, quién va adelante y en qué rubro se deja de pagar el bono.',
    months: false,
    needsStation: false,
  },
  {
    id: 'cumplimiento',
    title: 'Matriz de cumplimiento',
    audience: 'Dirección y gerentes de zona',
    description: 'Todas las estaciones contra todos los rubros, con color según qué tan cerca están de la meta.',
    months: false,
    needsStation: false,
  },
  {
    id: 'pagos',
    title: 'Bonos a pagar',
    audience: 'Recursos humanos',
    description: 'El monto a pagar por estación, listo para nómina. Si el periodo sigue abierto, el monto es estimado.',
    months: false,
    needsStation: false,
  },
  {
    id: 'tendencia',
    title: 'Tendencia',
    audience: 'Dirección, gerentes de zona y de estación',
    description: 'Varios meses seguidos para ver si la red, cada rubro y cada estación mejoran o empeoran.',
    months: true,
    needsStation: false,
  },
  {
    id: 'estacion',
    title: 'Ficha de estación',
    audience: 'Gerentes de estación y jefes de piso',
    description: 'El detalle de una estación: cada rubro, el ritmo de aceite, las encuestas y los últimos meses.',
    months: false,
    needsStation: true,
  },
  {
    id: 'encuestas',
    title: 'Encuestas',
    audience: 'Dirección y gerentes de zona',
    description: 'Promedio por estación, cuántas respuestas llegaron y cuáles estaciones todavía no contestan.',
    months: false,
    needsStation: false,
  },
];

export function findReport(id: string | undefined): ReportCard | undefined {
  return REPORT_CATALOG.find((report) => report.id === id);
}
