import { Binoculars, ClipboardText, Drop } from '@phosphor-icons/react';
import type { DirectorBreakdownLevel, DirectorOilRank } from '@portal/shared';
import { useSearchParams } from 'react-router-dom';
import { DirectorOilView } from '../components/direccion/DirectorOilView';
import { DirectorSurveysView } from '../components/direccion/DirectorSurveysView';
import { HierarchyFilter } from '../components/dashboard/HierarchyFilter';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { IconTile } from '../components/ui/IconTile';
import { Select } from '../components/ui/Select';

function currentYear(): number {
  return new Date().getFullYear();
}

export function DirectorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const year = Number(searchParams.get('year')) || currentYear();
  const monthRaw = Number(searchParams.get('mes'));
  const month = monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null;
  const companyId = searchParams.get('companyId');
  const zoneId = searchParams.get('zoneId');
  const managerId = searchParams.get('managerId');
  const stationId = searchParams.get('stationId');
  const view = searchParams.get('vista') === 'aceites' ? 'aceites' : 'encuestas';

  const patch = (updates: Record<string, string | null>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('year', String(year));
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const years = Array.from(new Set([currentYear(), currentYear() - 1, currentYear() - 2, year])).sort((left, right) => right - left);

  const drill = (level: DirectorBreakdownLevel, id: string) => {
    if (level === 'company') patch({ companyId: id, zoneId: null, managerId: null, stationId: null });
    else if (level === 'zone') patch({ zoneId: id, managerId: null, stationId: null });
    else if (level === 'station') patch({ stationId: id });
  };

  const openStation = (row: DirectorOilRank) => {
    patch({ companyId: row.companyId, zoneId: row.zoneId, stationId: row.stationId });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <IconTile icon={Binoculars} size="sm" />
        Dirección
      </h1>

      <Card className="sticky top-0 z-30">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-40">
            <Select
              label="Ejercicio"
              value={String(year)}
              onChange={(event) => patch({ year: event.target.value, mes: null })}
              options={years.map((option) => ({ value: String(option), label: String(option) }))}
            />
          </div>
          <Button type="button" variant="ghost" onClick={() => patch({ companyId: null, zoneId: null, managerId: null, stationId: null })}>
            Limpiar filtros
          </Button>
        </div>
        <HierarchyFilter
          companyId={companyId}
          zoneId={zoneId}
          managerId={managerId}
          stationId={stationId}
          onCompanyChange={(id) => patch({ companyId: id, zoneId: null, managerId: null, stationId: null })}
          onZoneChange={(id) => patch({ zoneId: id, managerId: null, stationId: null })}
          onManagerChange={(id) => patch({ managerId: id, stationId: null })}
          onStationChange={(id) => patch({ stationId: id })}
        />
      </Card>

      <div role="tablist" aria-label="Vista de dirección" className="flex gap-2">
        <Button
          type="button"
          role="tab"
          aria-selected={view === 'encuestas'}
          variant={view === 'encuestas' ? 'primary' : 'secondary'}
          onClick={() => patch({ vista: null })}
        >
          <ClipboardText size={18} aria-hidden />
          Encuestas
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={view === 'aceites'}
          variant={view === 'aceites' ? 'primary' : 'secondary'}
          onClick={() => patch({ vista: 'aceites' })}
        >
          <Drop size={18} aria-hidden />
          Aceites
        </Button>
      </div>

      {view === 'encuestas' ? (
        <DirectorSurveysView
          year={year}
          month={month}
          onMonthChange={(next) => patch({ mes: next === null ? null : String(next) })}
          companyId={companyId}
          zoneId={zoneId}
          managerId={managerId}
          stationId={stationId}
        />
      ) : (
        <DirectorOilView
          year={year}
          companyId={companyId}
          zoneId={zoneId}
          managerId={managerId}
          stationId={stationId}
          onDrill={drill}
          onOpenStation={openStation}
        />
      )}
    </div>
  );
}
