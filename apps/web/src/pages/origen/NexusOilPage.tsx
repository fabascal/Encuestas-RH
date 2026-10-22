import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, CalendarBlank, CheckCircle, Drop, GasPump, MapPinLine, WarningCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { NexusDayStatus, NexusOilDay } from '@portal/shared';
import { HierarchyFilter } from '../../components/dashboard/HierarchyFilter';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { RefetchDialog } from '../../components/origen/RefetchDialog';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { IconTile } from '../../components/ui/IconTile';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { useNexusOil, useRefetchNexus } from '../../hooks/useNexusOil';
import { ApiError } from '../../lib/api';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });

const DAY_STATUS: Record<NexusDayStatus, string> = {
  ok: 'Consultado',
  failed: 'Falló',
  running: 'Consultando',
  missing: 'Sin consultar',
  future: 'Día futuro',
};

const DOT: Record<NexusDayStatus, string> = {
  ok: 'bg-success',
  failed: 'bg-danger',
  running: 'bg-warning',
  missing: 'bg-border',
  future: 'bg-border',
};

type RefetchTarget =
  | { kind: 'month'; from: string; to: string }
  | { kind: 'day'; day: NexusOilDay }
  | { kind: 'cell'; day: NexusOilDay; stationName: string; amount: number | null };

function mexicoToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const cursor = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1));
  cursor.setUTCDate(cursor.getUTCDate() + delta);
  return cursor.toISOString().slice(0, 10);
}

function currentPeriod(): string {
  return `${mexicoToday().slice(0, 7)}-01`;
}

function monthRange(period: string): { from: string; to: string } | null {
  const yesterday = shiftDay(mexicoToday(), -1);
  const [year, month] = period.split('-').map(Number);
  const last = new Date(Date.UTC(year ?? 0, month ?? 1, 0)).getUTCDate();
  const from = `${period.slice(0, 7)}-01`;
  const end = `${period.slice(0, 7)}-${String(last).padStart(2, '0')}`;
  if (from > yesterday) return null;
  return { from, to: end < yesterday ? end : yesterday };
}

function formatLong(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatStamp(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

const READ_ONLY_NOTICE = 'Solo puedes ver este dato. Para volver a consultar se necesita el permiso de ajustar';

export function NexusOilPage() {
  const { can } = useAuth();
  const canAdjust = can('origen.gestionar');
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') ?? currentPeriod();
  const companyId = searchParams.get('companyId');
  const zoneId = searchParams.get('zoneId');
  const stationId = searchParams.get('stationId');
  const oil = useNexusOil({ period, companyId, zoneId, stationId });
  const refetch = useRefetchNexus();
  const [target, setTarget] = useState<RefetchTarget | null>(null);
  const wasBusy = useRef(false);
  const range = monthRange(period);

  useEffect(() => {
    if (refetch.isBusy) {
      wasBusy.current = true;
      return;
    }
    if (wasBusy.current) {
      wasBusy.current = false;
      setTarget(null);
    }
  }, [refetch.isBusy]);

  const patch = (updates: Record<string, string | null>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!next.get('period')) next.set('period', period);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const confirm = () => {
    if (!target || refetch.isBusy) return;
    if (target.kind === 'month') refetch.start({ from: target.from, to: target.to });
    else refetch.start({ from: target.day.day, to: target.day.day });
  };

  const data = oil.data;
  const dialog = describeTarget(target);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <IconTile icon={Drop} size="sm" />
        Nexus
      </h1>

      <Card className="sticky top-0 z-30">
        <div className="mb-4">
          <PeriodPicker period={period} onChange={(value) => patch({ period: value })} />
        </div>
        <HierarchyFilter
          companyId={companyId}
          zoneId={zoneId}
          stationId={stationId}
          onCompanyChange={(id) => patch({ companyId: id, zoneId: null, stationId: null })}
          onZoneChange={(id) => patch({ zoneId: id, stationId: null })}
          onStationChange={(id) => patch({ stationId: id })}
        />
      </Card>

      {oil.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {oil.isError && (
        <Card>
          <p className="text-center text-sm text-danger">
            {oil.error instanceof ApiError ? oil.error.message : 'No se pudo cargar la venta de aceite.'}
          </p>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat icon={Drop} label="Total del mes" value={money.format(data.summary.total)} />
            <Stat icon={GasPump} label="Estaciones con dato" value={String(data.summary.stations)} tone="success" />
            <Stat icon={CheckCircle} label="Días consultados" value={String(data.summary.syncedDays)} tone="success" />
            <Stat icon={WarningCircle} label="Días con error" value={String(data.summary.failedDays)} tone="warning" />
            <Stat icon={MapPinLine} label="Sin estación" value={String(data.summary.unmatched)} tone="danger" />
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle icon={<CalendarBlank size={18} />}>Venta de aceite por día</CardTitle>
              {canAdjust && (
                <Button type="button" size="sm" disabled={!range} onClick={() => range && setTarget({ kind: 'month', ...range })}>
                  <ArrowsClockwise size={18} />
                  Volver a consultar el mes
                </Button>
              )}
            </div>
            <p className="mb-3 text-sm text-muted">
              Una celda marcada no tiene dato. Volver a consultar un día actualiza todas las estaciones de ese día.
            </p>
            {data.rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No hay estaciones en este filtro.</p>
            ) : (
              <div className="isolate max-h-[36rem] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="sticky left-0 top-0 z-30 bg-surface px-3 py-2 text-left font-medium">Estación</th>
                      <th className="sticky top-0 z-20 bg-surface px-3 py-2 text-right font-medium">Total</th>
                      {data.days.map((day) => (
                        <th key={day.day} className="sticky top-0 z-20 bg-surface px-1 py-2 text-center font-medium">
                          <button
                            type="button"
                            className="inline-flex flex-col items-center gap-1 rounded-control px-1 py-1 hover:bg-bg disabled:cursor-default disabled:hover:bg-transparent"
                            disabled={day.status === 'future'}
                            title={`${formatLong(day.day)} · ${DAY_STATUS[day.status]}`}
                            aria-label={`${formatLong(day.day)}, ${DAY_STATUS[day.status]}`}
                            onClick={() => setTarget({ kind: 'day', day })}
                          >
                            <span>{Number(day.day.slice(8, 10))}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${DOT[day.status]}`} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.stationId}>
                        <td className="sticky left-0 z-10 border-t border-border bg-surface px-3 py-2">
                          <p className="font-medium text-fg">{row.stationName}</p>
                          <p className="text-xs text-muted">
                            {row.zoneName} · {row.code}
                          </p>
                        </td>
                        <td className="border-t border-border px-3 py-2 text-right font-medium tabular-nums text-fg">
                          {row.total === null ? '—' : money.format(row.total)}
                        </td>
                        {data.days.map((day) => {
                          const amount = row.values[day.day] ?? null;
                          const missing = day.status !== 'future' && amount === null;
                          return (
                            <td
                              key={day.day}
                              className={`border-t border-border px-1 py-1 text-right ${missing ? 'bg-warning-soft' : ''}`}
                            >
                              <button
                                type="button"
                                className="w-full rounded-control px-1 py-1 text-xs tabular-nums text-fg hover:bg-bg disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
                                disabled={day.status === 'future'}
                                aria-label={`${row.stationName}, ${formatLong(day.day)}, ${amount === null ? 'sin dato' : money.format(amount)}`}
                                onClick={() => setTarget({ kind: 'cell', day, stationName: row.stationName, amount })}
                              >
                                {amount === null ? (day.status === 'future' ? '' : '—') : money.format(amount)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4" icon={<MapPinLine size={18} />}>
              Sin estación en el portal
            </CardTitle>
            <Table
              columns={[
                { key: 'code', header: 'Código', render: (row) => row.code },
                { key: 'amount', header: 'Importe', render: (row) => money.format(row.amount) },
                { key: 'days', header: 'Días', render: (row) => String(row.days) },
              ]}
              rows={data.unmatched}
              getRowKey={(row) => row.code}
              emptyMessage="Todos los códigos de Nexus están ligados"
            />
            {data.unmatched.length > 0 && (
              <Link to="/admin/integraciones/nexus_fuel/mapeo" className="mt-3 inline-block text-sm text-brand hover:underline">
                Ir a mapeo
              </Link>
            )}
          </Card>
        </>
      )}

      <RefetchDialog
        open={target !== null}
        title={dialog.title}
        detail={dialog.detail}
        notice={canAdjust ? dialog.notice : READ_ONLY_NOTICE}
        extra={dialog.extra}
        isBusy={refetch.isBusy}
        canConfirm={canAdjust}
        onClose={() => {
          if (!refetch.isBusy) setTarget(null);
        }}
        onConfirm={confirm}
      />
    </div>
  );
}

function describeTarget(target: RefetchTarget | null): { title: string; detail: string; notice: string; extra: string | null } {
  if (!target) {
    return { title: 'Volver a consultar', detail: '', notice: '', extra: null };
  }
  if (target.kind === 'month') {
    return {
      title: 'Volver a consultar el mes',
      detail: `Del ${formatLong(target.from)} al ${formatLong(target.to)}.`,
      notice: 'Nexus entrega todas las estaciones juntas. Se actualizará la venta de aceite de cada día de ese rango.',
      extra: null,
    };
  }
  const stamp = formatStamp(target.day.syncedAt);
  const extra = [
    target.day.error ? `Último error: ${target.day.error}` : null,
    stamp ? `Última consulta: ${stamp}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join(' · ');
  if (target.kind === 'day') {
    return {
      title: 'Volver a consultar este día',
      detail: formatLong(target.day.day),
      notice: 'Se actualizarán todas las estaciones de este día, no solo una.',
      extra: extra || null,
    };
  }
  return {
    title: target.stationName,
    detail: `${formatLong(target.day.day)} · ${target.amount === null ? 'Sin dato' : money.format(target.amount)}`,
    notice: 'Se actualizarán todas las estaciones de este día, no solo esta.',
    extra: extra || null,
  };
}

function Stat({
  icon,
  label,
  value,
  tone = 'brand',
}: {
  icon: typeof Drop;
  label: string;
  value: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <IconTile icon={icon} size="sm" tone={tone} />
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-lg font-semibold text-fg">{value}</p>
        </div>
      </div>
    </Card>
  );
}
