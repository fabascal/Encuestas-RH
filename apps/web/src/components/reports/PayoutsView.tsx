import { Money } from '@phosphor-icons/react';
import type { PayoutsReport } from '@portal/shared';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Table } from '../ui/Table';
import { SourceBadge } from './charts';
import { money, percent } from './format';

export function PayoutsView({ data }: { data: PayoutsReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={Money} size="sm" />}>A pagar {money(data.totalPayout)}</CardTitle>
        <SourceBadge source={data.source} />
      </CardHeader>
      {data.periodStatus === 'open' && (
        <p className="mb-4 text-sm text-warning">El periodo sigue abierto. Estos montos son estimados y pueden cambiar.</p>
      )}
      <Table
        columns={[
          { key: 'zone', header: 'Zona', render: (row) => row.zoneName },
          { key: 'station', header: 'Estación', render: (row) => `${row.stationName} (${row.stationCode})` },
          { key: 'pool', header: 'Bolsa', render: (row) => (row.configured ? money(row.poolAmount) : 'Sin reglas') },
          { key: 'payout', header: 'Pago', render: (row) => (row.configured ? money(row.totalPayout) : '—') },
          { key: 'paid', header: '%', render: (row) => percent(row.paidPct) },
          { key: 'source', header: 'Cálculo', render: (row) => (row.configured ? (row.source === 'cerrado' ? 'Definitivo' : 'Estimado') : '—') },
        ]}
        rows={data.rows}
        getRowKey={(row) => row.stationId}
        emptyMessage="No hay estaciones para los filtros seleccionados"
      />
    </Card>
  );
}
