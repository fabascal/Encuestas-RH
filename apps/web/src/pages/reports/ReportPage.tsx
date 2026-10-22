import { useState } from 'react';
import { ArrowLeft, FilePdf, FileXls } from '@phosphor-icons/react';
import type {
  ComplianceReport,
  PayoutsReport,
  StationReport,
  SummaryReport,
  SurveysReport,
  TrendReport,
} from '@portal/shared';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ComplianceView } from '../../components/reports/ComplianceView';
import { PayoutsView } from '../../components/reports/PayoutsView';
import { StationView } from '../../components/reports/StationView';
import { SummaryView } from '../../components/reports/SummaryView';
import { SurveysView } from '../../components/reports/SurveysView';
import { TrendView } from '../../components/reports/TrendView';
import { HierarchyFilter } from '../../components/dashboard/HierarchyFilter';
import { PeriodPicker } from '../../components/dashboard/PeriodPicker';
import { Button } from '../../components/ui/Button';
import { IconTile } from '../../components/ui/IconTile';
import { REPORT_ICONS } from '../../lib/icons';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { currentPeriod } from '../../context/FilterContext';
import { downloadReport, useReport } from '../../hooks/useReports';
import { ApiError } from '../../lib/api';
import { findReport } from './catalog';

export function ReportPage() {
  const { id } = useParams();
  const report = findReport(id);
  const [searchParams] = useSearchParams();
  const { can } = useAuth();
  const { showToast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(searchParams.get('stationId'));
  const [period, setPeriod] = useState(searchParams.get('period') ?? currentPeriod());
  const [months, setMonths] = useState(6);
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'xlsx' | null>(null);

  const filters = { period, months, companyId, zoneId, managerId, stationId };
  const reportId = report?.id ?? 'resumen';
  const withMonths = report?.months ?? false;
  const enabled = report !== undefined && (!report.needsStation || Boolean(stationId));
  const summary = useReport<SummaryReport>(reportId, filters, withMonths, enabled && reportId === 'resumen');
  const compliance = useReport<ComplianceReport>(reportId, filters, withMonths, enabled && reportId === 'cumplimiento');
  const payouts = useReport<PayoutsReport>(reportId, filters, withMonths, enabled && reportId === 'pagos');
  const trend = useReport<TrendReport>(reportId, filters, withMonths, enabled && reportId === 'tendencia');
  const station = useReport<StationReport>(reportId, filters, withMonths, enabled && reportId === 'estacion');
  const surveys = useReport<SurveysReport>(reportId, filters, withMonths, enabled && reportId === 'encuestas');

  if (!report) {
    return (
      <p className="text-sm text-muted">
        No se encontró el reporte. <Link to="/reportes" className="text-brand">Volver</Link>
      </p>
    );
  }

  const active = { resumen: summary, cumplimiento: compliance, pagos: payouts, tendencia: trend, estacion: station, encuestas: surveys }[report.id];

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    setIsDownloading(format);
    try {
      await downloadReport(report.id, format, filters, report.months);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'No se pudo descargar el reporte', 'danger');
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/reportes" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <ArrowLeft size={16} aria-hidden />
          Todos los reportes
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-fg">
          <IconTile icon={REPORT_ICONS[report.id]} size="sm" />
          {report.title}
        </h1>
        <p className="text-sm text-muted">Para: {report.audience}</p>
      </div>
      <Card>
        <div className="flex flex-col gap-4">
          <HierarchyFilter
            companyId={companyId}
            zoneId={zoneId}
            managerId={managerId}
            stationId={stationId}
            onCompanyChange={(next) => {
              setCompanyId(next);
              setZoneId(null);
              setManagerId(null);
              setStationId(null);
            }}
            onZoneChange={(next) => {
              setZoneId(next);
              setManagerId(null);
              setStationId(null);
            }}
            onManagerChange={(next) => {
              setManagerId(next);
              setStationId(null);
            }}
            onStationChange={setStationId}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <PeriodPicker period={period} onChange={setPeriod} />
              {report.months && (
                <Select
                  label="Meses"
                  value={String(months)}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  options={[3, 6, 9, 12].map((value) => ({ value: String(value), label: `${value} meses` }))}
                />
              )}
            </div>
            {can('reportes.exportar') && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" isLoading={isDownloading === 'pdf'} disabled={!enabled} onClick={() => void handleDownload('pdf')}>
                  <FilePdf size={18} /> PDF
                </Button>
                <Button variant="secondary" size="sm" isLoading={isDownloading === 'xlsx'} disabled={!enabled} onClick={() => void handleDownload('xlsx')}>
                  <FileXls size={18} /> Excel
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {report.needsStation && !stationId && <p className="text-sm text-muted">Elige una zona o un gerente y luego una estación para ver su ficha.</p>}
      {active.isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
      {active.isError && <p className="text-sm text-danger">{active.error instanceof ApiError ? active.error.message : 'No se pudo cargar el reporte'}</p>}
      {report.id === 'resumen' && summary.data && <SummaryView data={summary.data} />}
      {report.id === 'cumplimiento' && compliance.data && <ComplianceView data={compliance.data} />}
      {report.id === 'pagos' && payouts.data && <PayoutsView data={payouts.data} />}
      {report.id === 'tendencia' && trend.data && <TrendView data={trend.data} />}
      {report.id === 'estacion' && station.data && <StationView data={station.data} />}
      {report.id === 'encuestas' && surveys.data && <SurveysView data={surveys.data} />}
    </div>
  );
}
