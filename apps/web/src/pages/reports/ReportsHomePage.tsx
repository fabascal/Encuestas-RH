import { ChartBar } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { IconTile } from '../../components/ui/IconTile';
import { REPORT_ICONS } from '../../lib/icons';
import { REPORT_CATALOG } from './catalog';

export function ReportsHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
          <IconTile icon={ChartBar} size="sm" />
          Reportes
        </h1>
        <p className="mt-1 text-sm text-muted">Del resumen de la red al detalle de una estación. Cada uno se puede ver aquí o descargar en PDF y Excel.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {REPORT_CATALOG.map((report) => (
          <Link key={report.id} to={`/reportes/${report.id}`} className="block">
            <Card className="h-full hover:border-brand">
              <div className="mb-3">
                <IconTile icon={REPORT_ICONS[report.id]} />
              </div>
              <h2 className="text-base font-semibold text-fg">{report.title}</h2>
              <p className="mt-1 text-sm text-muted">{report.description}</p>
              <p className="mt-3 text-xs font-medium text-brand">Para: {report.audience}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
