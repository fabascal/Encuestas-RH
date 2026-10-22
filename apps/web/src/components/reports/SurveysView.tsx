import { ChartPie, ChatText, GasPump, ListBullets, Star, Warning } from '@phosphor-icons/react';
import type { SurveysReport } from '@portal/shared';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Table } from '../ui/Table';
import { BarList } from './charts';

const BANDS = [
  { key: 'alto', label: '90 o más' },
  { key: 'medio', label: '80 a 89' },
  { key: 'bajo', label: 'Menos de 80' },
] as const;

export function SurveysView({ data }: { data: SurveysReport }) {
  const total = data.bands.alto + data.bands.medio + data.bands.bajo;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Respuestas</p>
            <IconTile icon={ChatText} size="sm" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{data.responseCount}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Estaciones con respuesta</p>
            <IconTile icon={GasPump} size="sm" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{data.stationCount}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Promedio</p>
            <IconTile icon={Star} size="sm" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{data.average === null ? '—' : data.average.toFixed(1)}</p>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={ChartPie} size="sm" />}>Distribución</CardTitle></CardHeader>
        <BarList
          items={BANDS.map((band) => ({
            label: band.label,
            ratio: total === 0 ? null : data.bands[band.key] / total,
          }))}
        />
      </Card>
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={GasPump} size="sm" />}>Por estación</CardTitle></CardHeader>
        <Table
          columns={[
            { key: 'station', header: 'Estación', render: (row) => `${row.stationName} (${row.stationCode})` },
            { key: 'zone', header: 'Zona', render: (row) => row.zoneName },
            { key: 'responses', header: 'Respuestas', render: (row) => String(row.responses) },
            { key: 'average', header: 'Promedio', render: (row) => (row.average === null ? '—' : row.average.toFixed(1)) },
          ]}
          rows={data.stations.filter((row) => row.responses > 0)}
          getRowKey={(row) => row.stationId}
          emptyMessage="No hay encuestas en este periodo"
        />
      </Card>
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={Warning} size="sm" tone="warning" />}>Sin respuesta</CardTitle></CardHeader>
        <Table
          columns={[
            { key: 'station', header: 'Estación', render: (row) => `${row.stationName} (${row.stationCode})` },
            { key: 'zone', header: 'Zona', render: (row) => row.zoneName },
          ]}
          rows={data.missing}
          getRowKey={(row) => row.stationId}
          emptyMessage="Todas las estaciones del alcance ya tienen respuesta"
        />
      </Card>
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={ListBullets} size="sm" />}>Detalle</CardTitle></CardHeader>
        <Table
          columns={[
            { key: 'station', header: 'Estación', render: (row) => row.stationName },
            { key: 'date', header: 'Fecha', render: (row) => new Date(row.submittedAt).toLocaleString('es-MX') },
            {
              key: 'score',
              header: 'Puntuación',
              render: (row) => (row.excluded ? 'No considerada' : row.score === null ? '—' : row.score.toFixed(1)),
            },
          ]}
          rows={data.details}
          getRowKey={(row) => `${row.stationName}-${row.submittedAt}-${row.email ?? ''}`}
          emptyMessage="No hay respuestas"
        />
      </Card>
    </div>
  );
}
