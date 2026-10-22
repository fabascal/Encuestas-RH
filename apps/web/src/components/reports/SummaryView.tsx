import { useState } from 'react';
import { ArrowDown, CheckCircle, CoinVertical, MapTrifold, Money, TrendDown, TrendUp, Trophy, WarningCircle } from '@phosphor-icons/react';
import type { SummaryReport } from '@portal/shared';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile, KpiMark } from '../ui/IconTile';
import { PieChart, SourceBadge, zoneColor } from './charts';
import { money, moneyShort, percent, points } from './format';

export function SummaryView({ data }: { data: SummaryReport }) {
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const stationLink = (stationId: string) => `/reportes/estacion?stationId=${stationId}&period=${data.period}`;
  const falling = data.paidPctChange !== null && data.paidPctChange < 0;
  const paidZones = data.zones.filter((zone) => zone.totalPayout > 0);
  const unpaidZones = data.zones.filter((zone) => zone.totalPayout <= 0);
  const totalPaid = paidZones.reduce((sum, zone) => sum + zone.totalPayout, 0);
  const pieLabel = `Bolsa pagada por zona. Total ${money(totalPaid)}. ${paidZones
    .map((zone) => `${zone.zoneName} ${percent(totalPaid === 0 ? null : zone.totalPayout / totalPaid)}`)
    .join(', ')}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Bono a pagar</p>
            <IconTile icon={Money} size="sm" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{money(data.totalPayout)}</p>
          <p className="text-sm text-muted">de {money(data.poolAmount)} · {percent(data.paidPct)}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Contra el mes anterior</p>
            <IconTile icon={falling ? TrendDown : TrendUp} size="sm" tone={data.paidPctChange === null ? 'neutral' : falling ? 'danger' : 'success'} />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{points(data.paidPctChange)}</p>
          <p className="text-sm text-muted">antes {percent(data.previousPaidPct)}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Estaciones en meta</p>
            <IconTile icon={CheckCircle} size="sm" tone="success" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{data.stationsOnGoal}</p>
          <p className="text-sm text-muted">de {data.stationsConfigured} con reglas</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted">Sin reglas</p>
            <IconTile icon={WarningCircle} size="sm" tone="warning" />
          </div>
          <p className="mt-1 text-xl font-semibold text-fg">{data.stationsWithoutRules}</p>
          <div className="mt-1"><SourceBadge source={data.source} /></div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={MapTrifold} size="sm" />}>Bolsa pagada por zona</CardTitle></CardHeader>
        {totalPaid <= 0 ? (
          <p className="text-sm text-muted">Sin pagos en el periodo</p>
        ) : (
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-stretch">
            <div className="w-full max-w-80 shrink-0">
              <PieChart
                slices={paidZones.map((zone, index) => ({
                  id: zone.zoneName,
                  label: zone.zoneName,
                  value: zone.totalPayout,
                  color: zoneColor(index),
                }))}
                center={moneyShort(totalPaid)}
                label={pieLabel}
                active={activeZone}
                onActive={setActiveZone}
              />
            </div>
            <ul className="grid w-full flex-1 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] content-center gap-3">
              {paidZones.map((zone, index) => {
                const share = totalPaid === 0 ? null : zone.totalPayout / totalPaid;
                const selected = activeZone === zone.zoneName;
                return (
                  <li key={zone.zoneName} className="min-w-0">
                    <button
                      type="button"
                      onMouseEnter={() => setActiveZone(zone.zoneName)}
                      onMouseLeave={() => setActiveZone(null)}
                      onFocus={() => setActiveZone(zone.zoneName)}
                      onBlur={() => setActiveZone(null)}
                      className={`flex h-full w-full flex-col gap-1 rounded-card border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${selected ? 'border-brand bg-brand-soft' : 'border-border bg-bg'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: zoneColor(index) }} aria-hidden />
                        <span className="truncate text-sm font-medium text-fg">{zone.zoneName}</span>
                      </span>
                      <span className="text-2xl font-semibold tabular-nums text-fg">{percent(share)}</span>
                      <span className="text-sm text-fg">{money(zone.totalPayout)}</span>
                      <span className="text-xs text-muted">
                        {percent(zone.paidPct)} de su bolsa ({money(zone.totalPayout)} de {money(zone.poolAmount)})
                      </span>
                    </button>
                  </li>
                );
              })}
              {unpaidZones.map((zone) => (
                <li key={zone.zoneName} className="min-w-0">
                  <div className="flex h-full flex-col gap-1 rounded-card border border-border bg-bg px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-border" aria-hidden />
                      <span className="truncate text-sm font-medium text-fg">{zone.zoneName}</span>
                    </span>
                    <span className="text-sm text-muted">Sin pago</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankCard title="Mejor avance" icon={Trophy} rows={data.best} href={stationLink} />
        <RankCard title="Menor avance" icon={ArrowDown} rows={data.worst} href={stationLink} />
      </div>

      <Card>
        <CardHeader><CardTitle icon={<IconTile icon={CoinVertical} size="sm" />}>Dónde se deja de pagar</CardTitle></CardHeader>
        <ul className="flex flex-col gap-2">
          {data.lostByKpi.map((row) => (
            <li key={row.kpiCode} className="flex items-center justify-between gap-3 text-sm">
              <KpiMark code={row.kpiCode} name={row.kpiName} />
              <span className="font-medium text-fg">{money(row.lostAmount)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function RankCard({
  title,
  icon,
  rows,
  href,
}: {
  title: string;
  icon: typeof Trophy;
  rows: SummaryReport['best'];
  href: (stationId: string) => string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle icon={<IconTile icon={icon} size="sm" />}>{title}</CardTitle></CardHeader>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.stationId} className="flex items-center justify-between gap-3 text-sm">
            <Link to={href(row.stationId)} className="text-brand hover:underline">
              {row.stationName}
            </Link>
            <span className="text-muted">{percent(row.paidPct)} · {money(row.totalPayout)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-muted">Todavía no hay estaciones con reglas</li>}
      </ul>
    </Card>
  );
}
