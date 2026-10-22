import { ChartLine } from '@phosphor-icons/react';
import { useFilters } from '../context/FilterContext';
import { useStationBonus } from '../hooks/useBonus';
import { useKpiCategories } from '../hooks/useKpis';
import { BonusCalculatorCard } from '../components/dashboard/BonusCalculatorCard';
import { HierarchyFilter } from '../components/dashboard/HierarchyFilter';
import { OilPanel } from '../components/dashboard/OilPanel';
import { KpiCard } from '../components/dashboard/KpiCard';
import { PeriodPicker } from '../components/dashboard/PeriodPicker';
import { Card } from '../components/ui/Card';
import { IconTile } from '../components/ui/IconTile';
import { Spinner } from '../components/ui/Spinner';
import { ApiError } from '../lib/api';

export function DashboardPage() {
  const filters = useFilters();
  const kpiCategoriesQuery = useKpiCategories();
  const bonusQuery = useStationBonus(filters.stationId, filters.period);

  const categoryById = new Map((kpiCategoriesQuery.data ?? []).map((category) => [category.id, category]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
          <IconTile icon={ChartLine} size="sm" />
          Panel operativo
        </h1>
        <PeriodPicker period={filters.period} onChange={filters.setPeriod} />
      </div>

      <Card>
        <HierarchyFilter
          companyId={filters.companyId}
          zoneId={filters.zoneId}
          managerId={filters.managerId}
          stationId={filters.stationId}
          onCompanyChange={filters.setCompanyId}
          onZoneChange={filters.setZoneId}
          onManagerChange={filters.setManagerId}
          onStationChange={filters.setStationId}
        />
      </Card>

      <OilPanel
        filters={filters}
        onOpenStation={(row) =>
          filters.openStation({ companyId: row.companyId, zoneId: row.zoneId, stationId: row.stationId })
        }
      />

      {filters.stationId && bonusQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {filters.stationId && bonusQuery.isError && (
        <Card>
          <p className="text-center text-sm text-danger">
            {bonusQuery.error instanceof ApiError
              ? bonusQuery.error.message
              : 'No se pudo cargar la informacion de la estacion.'}
          </p>
        </Card>
      )}

      {filters.stationId && bonusQuery.data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bonusQuery.data.result.lines.map((line) => {
              const category = categoryById.get(line.kpiCategoryId);
              const rule = bonusQuery.data.rules.find((candidate) => candidate.kpiCategoryId === line.kpiCategoryId);
              const lowerIsBetter = rule?.comparator === 'lte' || rule?.higherIsBetter === false;
              return (
                <KpiCard
                  key={line.kpiCategoryId}
                  kpiCode={line.kpiCode}
                  name={category?.name ?? line.kpiName}
                  unit={category?.unit ?? 'count'}
                  actualValue={line.actualValue}
                  targetValue={line.targetValue}
                  progressPct={line.progressPct}
                  minThresholdPct={rule?.goalType === 'pass_fail' ? 100 : (rule?.minThresholdPct ?? 100)}
                  higherIsBetter={!lowerIsBetter}
                  {...(rule?.goalType === 'pass_fail'
                    ? { verdict: line.eligible ? ('Cumple' as const) : ('No cumple' as const) }
                    : {})}
                />
              );
            })}
          </div>

          <BonusCalculatorCard
            poolAmount={bonusQuery.data.result.poolAmount}
            mode={bonusQuery.data.ruleSet.mode}
            rules={bonusQuery.data.rules}
            actuals={Object.fromEntries(
              bonusQuery.data.result.lines.map((line) => [line.kpiCategoryId, line.actualValue]),
            )}
          />
        </>
      )}
    </div>
  );
}
