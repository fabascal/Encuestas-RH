import { GridFour } from '@phosphor-icons/react';
import type { ComplianceReport } from '@portal/shared';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile, KpiMark } from '../ui/IconTile';
import { HeatCell, SourceBadge } from './charts';
import { percent } from './format';

export function ComplianceView({ data }: { data: ComplianceReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={GridFour} size="sm" />}>Cumplimiento por rubro</CardTitle>
        <SourceBadge source={data.source} />
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Estación</th>
              {data.kpis.map((kpi) => (
                <th key={kpi.kpiCode} className="px-3 py-2 font-medium">
                  <KpiMark code={kpi.kpiCode} name={kpi.kpiName} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.stationId} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Link to={`/reportes/estacion?stationId=${row.stationId}&period=${data.period}`} className="text-brand hover:underline">
                    {row.stationName}
                  </Link>
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.kpiCode} className="px-3 py-2">
                    <HeatCell level={cell.level} label={percent(cell.progressPct)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-3 py-2 font-medium text-fg">Promedio</td>
              {data.totals.map((cell) => (
                <td key={cell.kpiCode} className="px-3 py-2">
                  <HeatCell level={cell.level} label={percent(cell.progressPct)} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
