import { ChartBar, Path } from '@phosphor-icons/react';
import type { TrendReport } from '@portal/shared';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { kpiIcon } from '../../lib/icons';
import { DirectionBadge, Sparkline, TrendLine } from './charts';
import { monthLabel, percent } from './format';

export function TrendView({ data }: { data: TrendReport }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={ChartBar} size="sm" />}>Bolsa pagada de la red</CardTitle></CardHeader>
        <TrendLine points={data.network.map((point) => ({ label: monthLabel(point.period), ratio: point.paidPct }))} />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.kpis.map((kpi) => (
          <Card key={kpi.kpiCode}>
            <CardHeader>
              <CardTitle icon={<IconTile icon={kpiIcon(kpi.kpiCode)} size="sm" />}>{kpi.kpiName}</CardTitle>
            </CardHeader>
            <TrendLine points={kpi.points.map((point) => ({ label: monthLabel(point.period), ratio: point.averageProgressPct }))} />
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={Path} size="sm" />}>Rumbo por estación</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium">Estación</th>
                <th className="px-3 py-2 font-medium">Rumbo</th>
                <th className="px-3 py-2 font-medium">Meses</th>
                <th className="px-3 py-2 font-medium">Último</th>
              </tr>
            </thead>
            <tbody>
              {data.stations.map((station) => {
                const last = station.points.at(-1)?.paidPct ?? null;
                return (
                  <tr key={station.stationId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-fg">{station.stationName}</td>
                    <td className="px-3 py-2"><DirectionBadge direction={station.direction} /></td>
                    <td className="px-3 py-2">
                      <Sparkline
                        values={station.points.map((point) => point.paidPct)}
                        label={`${station.stationName}: ${station.points.map((point) => percent(point.paidPct)).join(', ')}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted">{percent(last)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
