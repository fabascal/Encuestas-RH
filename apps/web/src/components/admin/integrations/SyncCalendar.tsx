import { useState } from 'react';
import type { IntegrationProvider } from '@portal/shared';
import { SYNC_STATUS_LABELS } from '@portal/shared';
import type { SyncStatus } from '@portal/shared';
import { useCredentials, useSyncCalendar, useSyncDay, useSyncNow } from '../../../hooks/useIntegrations';
import { ApiError } from '../../../lib/api';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { useToast } from '../../ui/Toast';
import { mexicoMonth, mexicoToday } from './mexicoDates';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const cursor = new Date(Date.UTC(year ?? 2026, (mon ?? 1) - 1 + delta, 1));
  return cursor.toISOString().slice(0, 7);
}

function monthCells(month: string): Array<string | null> {
  const [year, mon] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year ?? 2026, (mon ?? 1) - 1, 1));
  const pad = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year ?? 2026, mon ?? 1, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  return cells;
}

function money(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function statusLabel(status: string | undefined, day: string, today: string): { label: string; className: string } {
  if (day >= today) return { label: 'Futuro', className: 'border-border bg-bg text-muted' };
  if (status === 'success') return { label: 'Procesado', className: 'border-success bg-success-soft text-success' };
  if (status === 'failed') return { label: 'Con fallas', className: 'border-danger bg-danger-soft text-danger' };
  if (status === 'running') return { label: 'Pendiente', className: 'border-warning bg-warning-soft text-warning' };
  return { label: 'Sin consultar', className: 'border-border bg-surface text-muted' };
}

export function SyncCalendar({ provider }: { provider: IntegrationProvider }) {
  const { showToast } = useToast();
  const credentialsQuery = useCredentials();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;
  const [month, setMonth] = useState(mexicoMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const calendarQuery = useSyncCalendar(credential?.id ?? null, month);
  const dayQuery = useSyncDay(credential?.id ?? null, selected);
  const syncNow = useSyncNow();
  const today = mexicoToday();
  const byDay = new Map((calendarQuery.data?.days ?? []).map((row) => [row.day, row]));

  if (!credential) {
    return <Card><p className="text-sm text-muted">Guarda la conexión antes de ver el calendario.</p></Card>;
  }

  const summary = dayQuery.data?.summary;
  const stations = Array.isArray(summary?.stations) ? summary.stations : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
              Anterior
            </Button>
            <span className="text-sm font-medium text-fg">{month}</span>
            <Button size="sm" variant="secondary" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
              Siguiente
            </Button>
          </div>
        </CardHeader>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((label) => (
            <p key={label} className="text-center text-xs font-medium text-muted">
              {label}
            </p>
          ))}
          {monthCells(month).map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;
            const row = byDay.get(day);
            const tone = statusLabel(row?.status, day, today);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={[
                  'flex min-h-20 flex-col items-start rounded-control border p-2 text-left',
                  tone.className,
                  selected === day ? 'ring-2 ring-brand' : '',
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{Number(day.slice(8))}</span>
                <span className="text-xs">{tone.label}</span>
                {row && day < today && <span className="text-xs">{money(Number(row.total_amount))}</span>}
              </button>
            );
          })}
        </div>
      </Card>
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.split('-').reverse().join('/')}</CardTitle>
            {selected < today && (
              <Button
                size="sm"
                isLoading={syncNow.isPending}
                onClick={() =>
                  syncNow.mutate(
                    { id: credential.id, from: selected, to: selected },
                    {
                      onSuccess: () => showToast('El día quedó en cola', 'success'),
                      onError: (error) =>
                        showToast(error instanceof ApiError ? error.message : 'No se pudo procesar el día', 'danger'),
                    },
                  )
                }
              >
                Volver a procesar este día
              </Button>
            )}
          </CardHeader>
          {summary?.last_synced_at && (
            <p className="mb-3 text-sm text-muted">
              Última actualización: {new Date(summary.last_synced_at).toLocaleString('es-MX')}
            </p>
          )}
          {summary?.error_message && <p className="mb-3 text-sm text-danger">{summary.error_message}</p>}
          <div className="mb-4 flex flex-col gap-2">
            {(dayQuery.data?.runs ?? []).map((run) => (
              <div key={run.id} className="rounded-control border border-border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <Badge tone={run.status === 'failed' ? 'danger' : run.status === 'success' ? 'success' : 'neutral'}>
                    {run.status in SYNC_STATUS_LABELS ? SYNC_STATUS_LABELS[run.status as SyncStatus] : run.status}
                  </Badge>
                  <span className="text-muted">
                    {run.started_at ? new Date(run.started_at).toLocaleString('es-MX') : 'En cola'} · {run.records_upserted}{' '}
                    estaciones
                  </span>
                </div>
                <ul className="flex flex-col gap-1 text-sm text-fg">
                  {run.logs.map((entry) => (
                    <li key={entry.id}>
                      {entry.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {(dayQuery.data?.runs.length ?? 0) === 0 && <p className="text-sm text-muted">Sin corridas en este día.</p>}
          </div>
          <div className="flex flex-col gap-1">
            {stations.map((station) => (
              <p key={station.code} className="flex justify-between gap-3 text-sm">
                <span className={station.matched ? 'text-fg' : 'text-danger'}>
                  {station.stationName ?? station.code}
                  {station.matched ? '' : ' · sin estación en el portal'}
                </span>
                <span>{money(station.amount)}</span>
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
