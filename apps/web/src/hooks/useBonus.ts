import { useQuery } from '@tanstack/react-query';
import type { BonusCalculationResult, GoalRuleInput, RuleSetMode } from '@portal/shared';
import { api } from '../lib/api';

export interface GoalRuleSetSummary {
  id: string;
  scope_level: 'company' | 'zone' | 'station';
  pool_amount: string;
  mode: RuleSetMode;
  valid_during: string;
}

export interface StationBonusResponse {
  ruleSet: GoalRuleSetSummary;
  rules: GoalRuleInput[];
  result: BonusCalculationResult;
}

export function useStationBonus(stationId: string | null, period: string) {
  return useQuery({
    queryKey: ['station-bonus', stationId, period],
    queryFn: () => api.get<StationBonusResponse>(`/stations/${stationId}/bonus`, { period }),
    enabled: Boolean(stationId),
    retry: false,
  });
}
