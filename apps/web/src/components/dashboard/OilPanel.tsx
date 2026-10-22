import { useState } from 'react';
import { Drop } from '@phosphor-icons/react';
import type { GroupOilMonth, GroupOilRow, StationOilMonth } from '@portal/shared';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { ApiError } from '../../lib/api';
import { money, moneyShort, percent } from '../reports/format';
import { DailyBars, DeltaBadge, GoalBar, GoalRing, oilLevel, useMountAnimation } from '../direccion/visuals';
import type { DailyBarPoint } from '../direccion/visuals';
import { useOilPanel } from '../../hooks/useOilPanel';
import type { OilPanelFilters } from '../../hooks/useOilPanel';

const RANK_LIMIT = 15;

export function OilPanel({
  filters,
  onOpenStation,
}: {
  filters: OilPanelFilters;
  onOpenStation: (row: GroupOilRow) => void;
}) {
  const oil = useOilPanel(filters);

  if (oil.isLoading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </Card>
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

  if (!oil.data) return null;
  if (oil.data.mode === 'station') return <StationOil data={oil.data} />;
  return <GroupOil data={oil.data} onOpenStation={onOpenStation} />;
}

function StationOil({ data }: { data: StationOilMonth }) {
  const ahead = data.progress !== null && data.expectedByNow !== null && data.target ? (data.actual - data.expectedByNow) / data.target : null;
  const missing = data.target === null ? null : Math.max(data.target - data.actual, 0);
  const pace = data.target !== null && data.daysInMonth > 0 ? data.target / data.daysInMonth : null;
  let running = 0;
  const points: DailyBarPoint[] = data.days.map((day) => {
    if (day.value !== null) running += day.value;
    const label = String(Number(day.day.slice(8)));
    const detail =
      day.value === null
        ? `Día ${label}: todavía no hay venta.`
        : `Día ${label}: ${money(day.value)}. Acumulado ${money(running)}${data.target !== null ? ` de ${money(data.target)}` : ''}.`;
    return { key: day.day, label, value: day.value, target: pace, detail };
  });

  return (
    <Card>
      <CardTitle className="mb-4" icon={<Drop size={18} aria-hidden />}>
        Aceite · {data.stationName}
      </CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <GoalRing ratio={data.progress} goal={1} levelOf={oilLevel} />
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <Figure
            label={data.target === null ? 'Venta del mes' : 'Llevas'}
            value={data.target === null ? money(data.actual) : `${money(data.actual)} de ${money(data.target)}`}
            {...(data.target === null ? { detail: 'Sin meta' } : {})}
          />
          <Figure
            label="Faltan"
            value={missing === null ? 'Sin meta' : missing === 0 ? 'Meta cubierta' : money(missing)}
          />
          <Figure
            label="Ritmo"
            value={data.dailyNeeded === null ? 'Sin meta' : data.dailyNeeded === 0 ? 'Ya alcanzaste la meta' : `${money(data.dailyNeeded)} por día`}
            badge={ahead}
            {...(ahead === null ? {} : { detail: ahead >= 0 ? 'Adelantado' : 'Atrasado' })}
          />
          <Figure
            label="Proyección"
            value={data.projection === null ? 'Sin días suficientes' : money(data.projection)}
            {...(data.projectedProgress === null ? {} : { detail: `${percent(data.projectedProgress)} de la meta` })}
          />
        </div>
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold text-fg">Venta día por día</h3>
      <DailyBars points={points} ariaLabel={`Venta día por día de ${data.stationName}`} />
    </Card>
  );
}

function GroupOil({ data, onOpenStation }: { data: GroupOilMonth; onOpenStation: (row: GroupOilRow) => void }) {
  const [expanded, setExpanded] = useState(false);
  const mounted = useMountAnimation(`${data.period}:${data.rows.length}`);
  const visible = expanded ? data.rows : data.rows.slice(0, RANK_LIMIT);
  const hidden = data.rows.length - visible.length;

  return (
    <Card>
      <CardTitle className="mb-4" icon={<Drop size={18} aria-hidden />}>
        Aceite · {data.scopeLabel}
      </CardTitle>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <GoalRing ratio={data.progress} goal={1} levelOf={oilLevel} />
        <div>
          <p className="text-sm text-muted">{data.target === null ? 'Venta del grupo' : 'Llevas'}</p>
          <p className="text-lg font-semibold text-fg">
            {data.target === null ? money(data.actual) : `${money(data.measured)} de ${money(data.target)}`}
          </p>
          {data.target === null ? (
            <p className="text-sm text-muted">Sin meta</p>
          ) : (
            <p className="text-sm text-muted">
              Proyección {data.projection === null ? 'sin días suficientes' : money(data.projection)}
              {data.projectedProgress !== null ? ` (${percent(data.projectedProgress)} de la meta)` : ''}
            </p>
          )}
          {data.target !== null && data.actual !== data.measured && (
            <p className="text-sm text-muted">Venta total {money(data.actual)}, incluye estaciones sin meta.</p>
          )}
        </div>
      </div>

      {data.rows.length === 0 ? (
        <p className="text-sm text-muted">No hay estaciones en este alcance.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {visible.map((row) => (
            <li key={row.stationId}>
              <button
                type="button"
                onClick={() => onOpenStation(row)}
                className="w-full rounded-control px-2 py-2 text-left hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="font-medium text-fg">{row.stationName}</span>
                  <span className="text-sm text-muted">{row.zoneName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <GoalBar ratio={row.progress} mounted={mounted} goal={1} levelOf={oilLevel} />
                  </div>
                  <span className="w-16 text-right text-sm font-bold tabular-nums text-fg">
                    {row.progress === null ? 'Sin meta' : percent(row.progress)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {money(row.actual)}
                  {row.target !== null ? ` de ${money(row.target)}` : ''}
                  {row.projection !== null ? ` · Proyección ${moneyShort(row.projection)}` : ''}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}

      {hidden > 0 && (
        <Button type="button" variant="ghost" className="mt-3" onClick={() => setExpanded(true)}>
          Ver todas
        </Button>
      )}
    </Card>
  );
}

function Figure({
  label,
  value,
  detail,
  badge = null,
}: {
  label: string;
  value: string;
  detail?: string;
  badge?: number | null;
}) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-base font-semibold text-fg">{value}</p>
      {detail && <p className="text-sm text-muted">{detail}</p>}
      {badge !== null && badge !== undefined && <DeltaBadge delta={badge} />}
    </div>
  );
}
