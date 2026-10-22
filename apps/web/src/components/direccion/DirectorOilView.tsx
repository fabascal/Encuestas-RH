import { CaretRight, Drop, GridFour, Star, TrendUp, Warning } from '@phosphor-icons/react';
import type { DirectorBreakdownLevel, DirectorOilRank } from '@portal/shared';
import { Card, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Spinner } from '../ui/Spinner';
import { useDirectorOil } from '../../hooks/useDirectorOil';
import { ApiError } from '../../lib/api';
import { MONTH_LABELS } from '../../lib/surveySections';
import { money, percent } from '../reports/format';
import { DailyBars, GoalBar, GoalRing, HeatLegend, HeatSquare, Sparkline, oilLevel, useMountAnimation } from './visuals';
import type { DailyBarPoint } from './visuals';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function DirectorOilView({
  year,
  companyId,
  zoneId,
  managerId,
  stationId,
  onDrill,
  onOpenStation,
}: {
  year: number;
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
  onDrill: (level: DirectorBreakdownLevel, id: string) => void;
  onOpenStation: (row: DirectorOilRank) => void;
}) {
  const oil = useDirectorOil({ year, companyId, zoneId, managerId, stationId });
  const data = oil.data;

  if (oil.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (oil.isError) {
    return (
      <Card>
        <p className="text-center text-sm text-danger">
          {oil.error instanceof ApiError ? oil.error.message : 'No se pudo cargar la venta de aceite.'}
        </p>
      </Card>
    );
  }

  if (!data) return null;

  const monthName = data.referenceMonth ? (MONTH_NAMES[data.referenceMonth - 1] ?? '') : '';
  const points: DailyBarPoint[] = data.monthly.map((month) => {
    const name = MONTH_LABELS[month.month - 1] ?? String(month.month);
    const detail =
      month.actual === null
        ? `${name}: sin dato`
        : `${name}: venta ${money(month.actual)}${month.target !== null ? `, meta ${money(month.target)} (${percent(month.progress)})` : ', sin meta'}.`;
    return { key: String(month.month), label: name, value: month.actual, target: month.target, detail };
  });
  const canOpen = data.level !== 'survey';

  return (
    <>
      {!data.hasTargets && (
        <Card>
          <p className="text-center text-sm text-muted">No hay metas de aceite configuradas para este alcance.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-start gap-3">
            <IconTile icon={Drop} size="sm" />
            <div className="min-w-0">
              <p className="text-sm text-muted">Venta del año</p>
              <p className="text-lg font-semibold text-fg">{money(data.totals.actual)}</p>
              <Sparkline values={data.monthly.map((month) => month.actual)} label="Venta mensual de aceite" goal={null} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-start gap-3">
                <IconTile icon={Star} size="sm" tone={data.hasTargets ? 'brand' : 'neutral'} />
                <div>
                  <p className="text-sm text-muted">Avance del año</p>
                  <p className="text-lg font-semibold text-fg">{data.hasTargets ? percent(data.totals.progress) : 'Sin meta'}</p>
                </div>
              </div>
              {data.hasTargets && data.totals.target !== null && (
                <p className="mt-2 text-sm text-muted">
                  {money(data.totals.measured)} de {money(data.totals.target)}
                </p>
              )}
            </div>
            {data.hasTargets && <GoalRing ratio={data.totals.progress} goal={1} levelOf={oilLevel} />}
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <IconTile icon={GridFour} size="sm" />
            <div>
              <p className="text-sm text-muted">Estaciones en meta{monthName ? ` en ${monthName}` : ''}</p>
              <p className="text-lg font-semibold text-fg">
                {data.hasTargets ? `${data.totals.onGoal} de ${data.totals.stations}` : 'Sin meta'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <IconTile icon={data.totals.weakest ? Warning : TrendUp} size="sm" tone={data.totals.weakest ? 'warning' : 'success'} />
            <div>
              <p className="text-sm text-muted">Mes más fuerte y más débil</p>
              <p className="text-lg font-semibold text-fg">{monthExtreme(data.totals.strongest)}</p>
              {data.totals.weakest && <p className="text-sm text-muted">Débil: {monthExtreme(data.totals.weakest)}</p>}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-4" icon={<TrendUp size={18} aria-hidden />}>
          Venta contra meta por mes
        </CardTitle>
        <DailyBars points={points} ariaLabel="Venta de aceite contra la meta de cada mes" />
      </Card>

      <Card>
        <CardTitle className="mb-1">{breakdownTitle(data.level)}</CardTitle>
        <p className="mb-4 text-sm text-muted">{data.scopeLabel}</p>
        {data.breakdown.length === 0 ? (
          <p className="text-sm text-muted">No hay estaciones en este alcance.</p>
        ) : (
          <OilHeat rows={data.breakdown} canOpen={canOpen} onOpen={(id) => onDrill(data.level, id)} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankCard title={`Más lejos${monthName ? ` en ${monthName}` : ''}`} rows={data.farthest} onOpenStation={onOpenStation} />
        <RankCard title={`Mejores${monthName ? ` en ${monthName}` : ''}`} rows={data.best} onOpenStation={onOpenStation} />
      </div>
    </>
  );
}

function monthExtreme(month: { month: number; progress: number | null; actual: number } | null): string {
  if (!month) return '—';
  const name = MONTH_NAMES[month.month - 1] ?? '';
  const titled = name.charAt(0).toLocaleUpperCase('es-MX') + name.slice(1);
  return month.progress === null ? titled : `${titled} (${percent(month.progress)})`;
}

function breakdownTitle(level: DirectorBreakdownLevel): string {
  if (level === 'company') return 'Avance por empresa';
  if (level === 'zone') return 'Avance por zona';
  if (level === 'station') return 'Avance por estación';
  return 'Avance de la estación';
}

function oilCaption(name: string, when: string, ratio: number | null): string {
  if (ratio === null) return `${name}, ${when}: sin meta`;
  return `${name}, ${when}: ${percent(ratio)}`;
}

function OilHeat({
  rows,
  canOpen,
  onOpen,
}: {
  rows: Array<{ id: string; label: string; progress: number | null; months: Array<number | null> }>;
  canOpen: boolean;
  onOpen: (id: string) => void;
}) {
  const mounted = useMountAnimation(rows.map((row) => row.id).join('|'));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-[1] bg-surface px-2 py-2 font-medium">Nombre</th>
            <th className="px-2 py-2 font-medium">Año</th>
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-2 py-2 text-center font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b border-border last:border-0 ${canOpen ? 'cursor-pointer hover:bg-bg' : ''}`}
              onClick={() => {
                if (canOpen) onOpen(row.id);
              }}
            >
              <th className="sticky left-0 z-[1] bg-surface px-2 py-2 text-left font-medium text-fg">
                {canOpen ? (
                  <button
                    type="button"
                    aria-label={`Ver detalle de ${row.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row.id);
                    }}
                    className="inline-flex items-center gap-1 text-left text-brand hover:underline"
                  >
                    {row.label}
                    <CaretRight size={14} aria-hidden />
                  </button>
                ) : (
                  row.label
                )}
              </th>
              <td className="min-w-36 px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-16 flex-1">
                    <GoalBar ratio={row.progress} mounted={mounted} delay={index * 40} goal={1} levelOf={oilLevel} />
                  </div>
                  <span className="w-14 text-right text-sm font-bold tabular-nums text-fg">
                    {row.progress === null ? 'Sin meta' : percent(row.progress)}
                  </span>
                </div>
              </td>
              {row.months.map((ratio, monthIndex) => (
                <td key={MONTH_LABELS[monthIndex] ?? monthIndex} className="px-2 py-2 text-center">
                  <HeatSquare
                    compact
                    ratio={ratio}
                    goal={1}
                    levelOf={oilLevel}
                    title={oilCaption(row.label, MONTH_LABELS[monthIndex] ?? '', ratio)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <HeatLegend goal={1} />
    </div>
  );
}

function RankCard({
  title,
  rows,
  onOpenStation,
}: {
  title: string;
  rows: DirectorOilRank[];
  onOpenStation: (row: DirectorOilRank) => void;
}) {
  const mounted = useMountAnimation(`${title}:${rows.map((row) => row.stationId).join('|')}`);
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No hay estaciones con meta para ordenar.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.stationId}>
              <button type="button" onClick={() => onOpenStation(row)} className="w-full rounded-control px-1 py-1 text-left hover:bg-bg">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-medium text-fg">{row.stationName}</span>
                  <span className="text-sm font-bold tabular-nums text-fg">{percent(row.progress)}</span>
                </div>
                <GoalBar ratio={row.progress} mounted={mounted} goal={1} levelOf={oilLevel} />
                <p className="mt-1 text-xs text-muted">
                  {money(row.actual)}
                  {row.target !== null ? ` de ${money(row.target)}` : ''} · {row.zoneName}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
