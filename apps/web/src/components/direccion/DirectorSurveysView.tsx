import { useState } from 'react';
import { ChartBar, ChatText, GasPump, Star, TrendUp, Warning } from '@phosphor-icons/react';
import { StationCoverageModal } from './StationCoverageModal';
import { SectionBars, SectionTrend, WorstQuestions } from './DirectorCharts';
import { DeltaBadge, GoalRing, Sparkline, goalGap } from './visuals';
import { Card, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Select } from '../ui/Select';
import { Spinner } from '../ui/Spinner';
import { useDirectorSurveys } from '../../hooks/useDirectorSurveys';
import { ApiError } from '../../lib/api';
import { MONTH_NAMES, SECTION_GOAL, heatLevel, monthDelta, sectionLabel } from '../../lib/surveySections';

export function DirectorSurveysView({
  year,
  month,
  onMonthChange,
  companyId,
  zoneId,
  managerId,
  stationId,
}: {
  year: number;
  month: number | null;
  onMonthChange: (month: number | null) => void;
  companyId: string | null;
  zoneId: string | null;
  managerId: string | null;
  stationId: string | null;
}) {
  const [coverageOpen, setCoverageOpen] = useState(false);
  const filters = { year, companyId, zoneId, managerId, stationId };
  const surveys = useDirectorSurveys(filters);
  const monthSurveys = useDirectorSurveys(month === null ? filters : { ...filters, month }, month !== null);
  const data = surveys.data;
  const sectionNames = data?.sections.map((section) => section.section) ?? [];
  const card = month === null ? data : monthSurveys.data;
  const cardSections = card?.sections ?? [];
  const monthPending = month !== null && monthSurveys.isFetching;
  const monthName = month === null ? '' : (MONTH_NAMES[month - 1] ?? '');
  const monthOptions = [
    { value: '', label: 'Todo el año' },
    ...(data?.monthly ?? [])
      .filter((row) => row.total !== null)
      .map((row) => ({ value: String(row.month), label: MONTH_NAMES[row.month - 1] ?? '' })),
  ];

  return (
    <>
      {surveys.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {surveys.isError && (
        <Card>
          <p className="text-center text-sm text-danger">
            {surveys.error instanceof ApiError ? surveys.error.message : 'No se pudo cargar el panel de dirección.'}
          </p>
        </Card>
      )}

      {data && data.totals.surveys === 0 && (
        <Card>
          <p className="text-center text-sm text-muted">
            No hay encuestas del jefe de piso en {year}
            {data.scopeLabel === 'Todas las estaciones' ? '' : ` para ${data.scopeLabel}`}.
          </p>
        </Card>
      )}

      {data && data.totals.surveys > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={ChatText} label="Encuestas" value={String(data.totals.surveys)} />
            <Stat
              icon={GasPump}
              label="Estaciones que contestaron"
              value={`${data.totals.stations} de ${data.totals.stationsInScope}`}
              onClick={() => setCoverageOpen(true)}
            />
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <IconTile icon={Star} size="sm" tone={scoreTone(data.totals.score)} />
                    <div>
                      <p className="text-sm text-muted">Calificación del año</p>
                      <DeltaBadge delta={monthDelta(data.monthly.map((month) => month.total))} />
                    </div>
                  </div>
                  <Sparkline values={data.monthly.map((month) => month.total)} label="Calificación mensual del ejercicio" />
                </div>
                <GoalRing ratio={data.totals.score} />
              </div>
            </Card>
            <Stat
              icon={Warning}
              label="Sección más débil"
              value={data.totals.weakest ? sectionLabel(data.totals.weakest.section) : '—'}
              tone={data.totals.weakest && data.totals.weakest.ratio < SECTION_GOAL ? 'warning' : 'success'}
              {...(data.totals.weakest ? { detail: goalGap(data.totals.weakest.ratio) } : {})}
            />
          </div>

          {data.sections.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-muted">Hay encuestas en este ejercicio, pero ninguna trae secciones.</p>
            </Card>
          ) : (
            <>
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <CardTitle icon={<ChartBar size={18} aria-hidden />}>Calificación por sección</CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      {monthPending && <Spinner size="sm" />}
                      <div className="w-40">
                        <Select
                          aria-label="Mes"
                          value={month === null ? '' : String(month)}
                          onChange={(event) => onMonthChange(event.target.value === '' ? null : Number(event.target.value))}
                          options={monthOptions}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted">
                      {cardSections.filter((section) => heatLevel(section.ratio) === 'meta').length} de {cardSections.length} en meta
                    </p>
                  </div>
                </div>
                {month !== null && card === undefined ? null : month !== null && !monthPending && cardSections.length === 0 ? (
                  <p className="text-center text-sm text-muted">
                    No hay respuestas en {monthName} {year}.
                  </p>
                ) : (
                  <SectionBars
                    sections={cardSections}
                    monthly={month === null ? data.monthly : data.monthly.slice(0, month)}
                    filters={month === null ? filters : { ...filters, month }}
                  />
                )}
              </Card>

              <Card>
                <CardTitle className="mb-4" icon={<TrendUp size={18} aria-hidden />}>
                  Tendencia del ejercicio
                </CardTitle>
                <SectionTrend monthly={data.monthly} sections={sectionNames} />
              </Card>

              <Card>
                <CardTitle className="mb-4" icon={<Warning size={18} aria-hidden />}>
                  Preguntas con más no
                </CardTitle>
                {data.worstQuestions.length === 0 ? (
                  <p className="text-sm text-muted">Ninguna pregunta tiene respuestas en no.</p>
                ) : (
                  <WorstQuestions questions={data.worstQuestions} />
                )}
              </Card>
            </>
          )}
        </>
      )}
      {coverageOpen && data && (
        <StationCoverageModal
          filters={filters}
          initialMonth={month}
          scopeLabel={data.scopeLabel}
          onClose={() => setCoverageOpen(false)}
        />
      )}
    </>
  );
}

function scoreTone(ratio: number | null): 'success' | 'warning' | 'danger' | 'brand' {
  const level = heatLevel(ratio);
  if (level === 'meta') return 'success';
  if (level === 'cerca') return 'warning';
  if (level === 'lejos') return 'danger';
  return 'brand';
}

function Stat({
  icon,
  label,
  value,
  detail,
  tone = 'brand',
  onClick,
}: {
  icon: typeof ChatText;
  label: string;
  value: string;
  detail?: string;
  tone?: 'brand' | 'success' | 'warning';
  onClick?: () => void;
}) {
  const body = (
    <div className="flex items-start gap-3">
      <IconTile icon={icon} size="sm" tone={tone} />
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-lg font-semibold text-fg">{value}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
        {onClick && <p className="text-xs text-muted">Ver detalle</p>}
      </div>
    </div>
  );
  if (!onClick) return <Card>{body}</Card>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="rounded-card border border-border bg-surface p-4 text-left shadow-sm hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:p-6"
    >
      {body}
    </button>
  );
}
