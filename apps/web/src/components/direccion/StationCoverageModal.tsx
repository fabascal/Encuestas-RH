import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DirectorStationCoverage } from '@portal/shared';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Spinner } from '../ui/Spinner';
import { useSurveyCoverage } from '../../hooks/useSurveyCoverage';
import type { DirectorFilters } from '../../hooks/useDirectorSurveys';
import { ApiError } from '../../lib/api';
import { MONTH_NAMES } from '../../lib/surveySections';

export function StationCoverageModal({
  filters,
  initialMonth,
  scopeLabel,
  onClose,
}: {
  filters: DirectorFilters;
  initialMonth: number | null;
  scopeLabel: string;
  onClose: () => void;
}) {
  const [month, setMonth] = useState<number | null>(initialMonth);
  const [search, setSearch] = useState('');
  const coverage = useSurveyCoverage(month === null ? filters : { ...filters, month }, true);
  const stations = coverage.data?.stations ?? [];
  const titleScope = coverage.data?.scopeLabel ?? scopeLabel;
  const needle = fold(search);
  const visible = useMemo(
    () => stations.filter((station) => needle === '' || fold(`${station.stationName} ${station.zoneName} ${station.managerName ?? ''}`).includes(needle)),
    [stations, needle],
  );
  const missing = [...visible.filter((station) => station.surveys === 0)].sort((left, right) =>
    left.stationName.localeCompare(right.stationName, 'es'),
  );
  const answered = [...visible.filter((station) => station.surveys > 0)].sort(
    (left, right) => left.surveys - right.surveys || left.stationName.localeCompare(right.stationName, 'es'),
  );
  const withSurveys = stations.filter((station) => station.surveys > 0).length;
  const surveyTotal = stations.reduce((sum, station) => sum + station.surveys, 0);
  const monthOptions = [
    { value: '', label: 'Todo el año' },
    ...MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: name })),
  ];

  return (
    <Modal open onClose={onClose} title={`Cobertura de encuestas · ${titleScope}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-44">
            <Select
              label="Mes"
              value={month === null ? '' : String(month)}
              onChange={(event) => setMonth(event.target.value === '' ? null : Number(event.target.value))}
              options={monthOptions}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              label="Buscar"
              placeholder="Estación, zona o gerente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {coverage.isLoading && stations.length === 0 ? (
          <div className="flex flex-col gap-3" aria-hidden>
            <div className="h-16 animate-pulse rounded-card bg-border" />
            <div className="h-24 animate-pulse rounded-card bg-border" />
            <div className="h-24 animate-pulse rounded-card bg-border" />
          </div>
        ) : coverage.isError ? (
          <p className="text-center text-sm text-danger">
            {coverage.error instanceof ApiError ? coverage.error.message : 'No se pudo cargar la cobertura.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Count label="Con encuestas" value={String(withSurveys)} />
              <Count label="Sin encuestas" value={String(stations.length - withSurveys)} />
              <Count label="Encuestas" value={String(surveyTotal)} />
            </div>
            {coverage.isFetching && (
              <div className="flex justify-end">
                <Spinner size="sm" />
              </div>
            )}
            {visible.length === 0 ? (
              <p className="text-center text-sm text-muted">Ninguna estación coincide con la búsqueda.</p>
            ) : (
              <>
                {stations.every((station) => station.surveys > 0) ? (
                  <p className="text-sm text-muted">Todas las estaciones tienen encuestas.</p>
                ) : (
                  <StationGroup title="Sin encuestas" count={missing.length} tone="danger" empty="Ninguna estación sin encuestas coincide.">
                    {missing.map((station) => (
                      <li key={station.stationId} className="px-3 py-2">
                        <p className="text-sm font-medium text-fg">{station.stationName}</p>
                        <p className="text-xs text-muted">
                          {station.zoneName} · {station.managerName ?? 'Sin gerente'}
                        </p>
                      </li>
                    ))}
                  </StationGroup>
                )}
                {answered.length > 0 && (
                  <StationGroup title="Con encuestas" count={answered.length} tone="success">
                    {answered.map((station) => (
                      <CoverageRow key={station.stationId} station={station} />
                    ))}
                  </StationGroup>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-bg px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}

function StationGroup({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: 'danger' | 'success';
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <Badge tone={tone}>{count}</Badge>
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-control border border-border">{children}</ul>
      )}
    </section>
  );
}

function CoverageRow({ station }: { station: DirectorStationCoverage }) {
  const when = station.lastSubmittedAt
    ? new Date(station.lastSubmittedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">{station.stationName}</p>
        <p className="text-xs text-muted">
          {station.zoneName} · {station.managerName ?? 'Sin gerente'}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-fg">
          {station.surveys} {station.surveys === 1 ? 'encuesta' : 'encuestas'}
        </p>
        {when && <p className="text-xs text-muted">{when}</p>}
      </div>
    </li>
  );
}
