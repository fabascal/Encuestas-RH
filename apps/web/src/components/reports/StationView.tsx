import { ClipboardText, Drop, GasPump, Target, TrendUp } from '@phosphor-icons/react';
import type { StationReport } from '@portal/shared';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile, KpiMark } from '../ui/IconTile';
import { Table } from '../ui/Table';
import { HeatCell, SourceBadge, TrendLine } from './charts';
import { money, monthLabel, percent } from './format';

export function StationView({ data }: { data: StationReport }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle icon={<IconTile icon={GasPump} size="sm" />}>{data.stationName}</CardTitle>
          <SourceBadge source={data.source} />
        </CardHeader>
        <p className="text-sm text-muted">{data.companyName} · {data.zoneName} · {data.stationCode}</p>
        <p className="mt-2 text-sm text-fg">Bolsa {money(data.poolAmount)} · Bono {money(data.totalPayout)}</p>
        {!data.configured && <p className="mt-2 text-sm text-warning">Esta estación no tiene reglas de bono para el periodo.</p>}
      </Card>

      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={Target} size="sm" />}>Rubros</CardTitle></CardHeader>
        <Table
          columns={[
            { key: 'kpi', header: 'Rubro', render: (row) => <KpiMark code={row.kpiCode} name={row.kpiName} /> },
            { key: 'actual', header: 'Real', render: (row) => row.actualValue.toLocaleString('es-MX') },
            { key: 'target', header: 'Meta', render: (row) => row.targetValue.toLocaleString('es-MX') },
            { key: 'progress', header: 'Avance', render: (row) => <HeatCell level={row.level} label={percent(row.progressPct)} /> },
            {
              key: 'gap',
              header: 'Falta',
              render: (row) => {
                if (row.gap === null) return '—';
                if (row.gap <= 0) return 'En meta';
                return row.higherIsBetter ? `Faltan ${row.gap.toLocaleString('es-MX')}` : `Hay que bajar ${row.gap.toLocaleString('es-MX')}`;
              },
            },
            { key: 'payout', header: 'Pago', render: (row) => money(row.payout) },
          ]}
          rows={data.lines}
          getRowKey={(row) => row.kpiCode}
          emptyMessage="Sin rubros para este periodo"
        />
      </Card>

      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={TrendUp} size="sm" />}>Últimos 6 meses</CardTitle></CardHeader>
        <TrendLine points={data.history.map((point) => ({ label: monthLabel(point.period), ratio: point.paidPct }))} />
      </Card>

      {data.oil && (
        <Card>
          <CardHeader><CardTitle icon={<IconTile icon={Drop} size="sm" />}>Venta de aceite</CardTitle></CardHeader>
          <p className="text-sm text-fg">
            Llevas {data.oil.actual.toLocaleString('es-MX')}
            {data.oil.target !== null && ` de ${data.oil.target.toLocaleString('es-MX')}`}.
            {data.oil.expectedByNow !== null && ` A este día del mes tocaba llevar ${data.oil.expectedByNow.toLocaleString('es-MX')}.`}
          </p>
          {data.oil.dailyNeeded !== null && (
            <p className="mt-1 text-sm text-muted">
              {data.oil.dailyNeeded <= 0
                ? 'La meta del mes ya está cubierta.'
                : `Para llegar hacen falta ${data.oil.dailyNeeded.toLocaleString('es-MX')} por día.`}
            </p>
          )}
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={ClipboardText} size="sm" />}>Encuestas del mes</CardTitle></CardHeader>
        <Table
          columns={[
            { key: 'date', header: 'Fecha', render: (row) => new Date(row.submittedAt).toLocaleString('es-MX') },
            { key: 'email', header: 'Correo', render: (row) => row.email ?? '—' },
            { key: 'score', header: 'Puntuación', render: (row) => (row.score === null ? '—' : row.score.toFixed(1)) },
          ]}
          rows={data.surveys}
          getRowKey={(row) => row.submittedAt + (row.email ?? '')}
          emptyMessage="No hay encuestas en este periodo"
        />
      </Card>
    </div>
  );
}
