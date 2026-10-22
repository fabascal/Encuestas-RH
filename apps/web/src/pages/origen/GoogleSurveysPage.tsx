import { useState } from 'react';
import { ArrowCounterClockwise, ChatText, CheckCircle, Database, EyeSlash, MapPinLine, WarningCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { GoogleSurveyRow } from '@portal/shared';
import { ExcludeSurveyDialog } from '../../components/origen/ExcludeSurveyDialog';
import { SurveyScore } from '../../components/surveys/SurveyScore';
import { HierarchyFilter } from '../../components/dashboard/HierarchyFilter';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { IconTile } from '../../components/ui/IconTile';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useGoogleSurveys, useSetSurveyExcluded } from '../../hooks/useGoogleSurveys';
import { ApiError } from '../../lib/api';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function answeredLabel(row: GoogleSurveyRow): string {
  return row.formTotal === null ? String(row.answered) : `${row.answered} de ${row.formTotal}`;
}

export function GoogleSurveysPage() {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canAdjust = can('origen.gestionar');
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') ?? currentPeriod();
  const companyId = searchParams.get('companyId');
  const zoneId = searchParams.get('zoneId');
  const stationId = searchParams.get('stationId');
  const estado = (searchParams.get('estado') ?? 'todas') as 'todas' | 'consideradas' | 'no_consideradas';
  const [dialog, setDialog] = useState<{ id: string; mode: 'exclude' | 'include' } | null>(null);
  const surveys = useGoogleSurveys({ period, companyId, zoneId, stationId, estado });
  const update = useSetSurveyExcluded();

  const patch = (updates: Record<string, string | null>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!next.get('period')) next.set('period', period);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const confirm = (reason?: string) => {
    if (!dialog) return;
    update.mutate(
      { id: dialog.id, excluded: dialog.mode === 'exclude', ...(reason ? { reason } : {}) },
      {
        onSuccess: () => {
          showToast(
            dialog.mode === 'exclude' ? 'La encuesta ya no cuenta en los promedios' : 'La encuesta vuelve a contar en los promedios',
            'success',
          );
          setDialog(null);
        },
        onError: (error) => showToast(error instanceof ApiError ? error.message : 'No se pudo actualizar la encuesta', 'danger'),
      },
    );
  };

  const data = surveys.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <IconTile icon={Database} size="sm" />
        Google Forms
      </h1>

      <Card className="sticky top-0 z-30">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PeriodPicker period={period} onChange={(value) => patch({ period: value })} />
          <div className="w-full sm:max-w-56">
            <Select
              label="Estado"
              value={estado}
              onChange={(event) => patch({ estado: event.target.value === 'todas' ? null : event.target.value })}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'consideradas', label: 'Consideradas' },
                { value: 'no_consideradas', label: 'No consideradas' },
              ]}
            />
          </div>
        </div>
        <HierarchyFilter
          companyId={companyId}
          zoneId={zoneId}
          stationId={stationId}
          onCompanyChange={(id) => patch({ companyId: id, zoneId: null, stationId: null })}
          onZoneChange={(id) => patch({ zoneId: id, stationId: null })}
          onStationChange={(id) => patch({ stationId: id })}
        />
      </Card>

      {surveys.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {surveys.isError && (
        <Card>
          <p className="text-center text-sm text-danger">
            {surveys.error instanceof ApiError ? surveys.error.message : 'No se pudieron cargar las encuestas.'}
          </p>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat icon={ChatText} label="Recibidas" value={String(data.summary.received)} />
            <Stat icon={CheckCircle} label="Consideradas" value={String(data.summary.considered)} tone="success" />
            <Stat icon={EyeSlash} label="No consideradas" value={String(data.summary.excluded)} tone="neutral" />
            <Stat icon={WarningCircle} label="Sin respuestas" value={String(data.summary.unanswered)} tone="warning" />
            <Stat icon={MapPinLine} label="Sin estación" value={String(data.summary.unmatched)} tone="danger" />
          </div>

          <Card>
            <CardTitle className="mb-4">Encuestas del mes</CardTitle>
            <Table
              columns={[
                {
                  key: 'date',
                  header: 'Fecha',
                  render: (row) => (
                    <Link to={`/origen/google/${row.id}?${searchParams.toString()}`} className="text-brand hover:underline">
                      {new Date(row.submittedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                    </Link>
                  ),
                },
                {
                  key: 'station',
                  header: 'Estación',
                  render: (row) => <span className={row.excluded ? 'text-muted' : ''}>{row.stationName}</span>,
                },
                {
                  key: 'who',
                  header: 'Contestó',
                  render: (row) =>
                    row.respondentName ? (
                      <span>
                        <span className="block text-fg">{row.respondentName}</span>
                        {row.email && <span className="block text-xs text-muted">{row.email}</span>}
                      </span>
                    ) : (
                      (row.email ?? '—')
                    ),
                },
                {
                  key: 'score',
                  header: 'Puntuación',
                  render: (row) => (
                    <SurveyScore
                      scoreText={row.scoreText}
                      score={row.score}
                      formScoreText={row.formScoreText}
                      naCount={row.naCount}
                    />
                  ),
                },
                {
                  key: 'answered',
                  header: 'Contestadas',
                  render: (row) => (
                    <span className="inline-flex items-center gap-2">
                      {answeredLabel(row)}
                      {row.answered === 0 && <Badge tone="warning">Sin respuestas</Badge>}
                    </span>
                  ),
                },
                {
                  key: 'state',
                  header: 'Estado',
                  render: (row) =>
                    row.excluded ? (
                      <span className="text-muted">
                        No considerada
                        {row.excludedReason ? ` · ${row.excludedReason}` : ''}
                        {row.excludedByName ? ` · ${row.excludedByName}` : ''}
                      </span>
                    ) : (
                      <Badge tone="success">Considerada</Badge>
                    ),
                },
                ...(canAdjust
                  ? [
                      {
                        key: 'action',
                        header: 'Acción',
                        render: (row: GoogleSurveyRow) => {
                          const label = row.excluded ? 'Volver a considerar' : 'No considerar';
                          return (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={label}
                              title={label}
                              className={row.excluded ? 'h-9 w-9 px-0 text-brand' : 'h-9 w-9 px-0 text-danger'}
                              onClick={() => setDialog({ id: row.id, mode: row.excluded ? 'include' : 'exclude' })}
                            >
                              {row.excluded ? <ArrowCounterClockwise size={18} /> : <EyeSlash size={18} />}
                            </Button>
                          );
                        },
                      },
                    ]
                  : []),
              ]}
              rows={data.rows}
              getRowKey={(row) => row.id}
              emptyMessage="No hay encuestas en este mes"
            />
          </Card>

          <Card>
            <CardTitle className="mb-4">Envíos sin procesar</CardTitle>
            <Table
              columns={[
                {
                  key: 'date',
                  header: 'Fecha',
                  render: (row) => new Date(row.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
                },
                { key: 'station', header: 'Estación recibida', render: (row) => row.stationName ?? '—' },
                { key: 'score', header: 'Puntuación', render: (row) => row.scoreText ?? '—' },
                {
                  key: 'status',
                  header: 'Motivo',
                  render: (row) => (
                    <Badge tone={row.status === 'unmatched' ? 'warning' : 'danger'}>
                      {row.status === 'unmatched' ? 'Sin estación' : 'Inválida'}
                      {row.message ? ` · ${row.message}` : ''}
                    </Badge>
                  ),
                },
                {
                  key: 'link',
                  header: '',
                  render: () => (
                    <Link to="/admin/integraciones/google_forms/mapeo" className="text-sm text-brand hover:underline">
                      Ir a mapeo
                    </Link>
                  ),
                },
              ]}
              rows={data.pending}
              getRowKey={(row) => row.id}
              emptyMessage="No hay envíos sin procesar en este mes"
            />
          </Card>
        </>
      )}

      <ExcludeSurveyDialog
        open={dialog !== null}
        mode={dialog?.mode ?? 'exclude'}
        isLoading={update.isPending}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = 'brand',
}: {
  icon: typeof ChatText;
  label: string;
  value: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <IconTile icon={icon} size="sm" tone={tone} />
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-lg font-semibold text-fg">{value}</p>
        </div>
      </div>
    </Card>
  );
}
