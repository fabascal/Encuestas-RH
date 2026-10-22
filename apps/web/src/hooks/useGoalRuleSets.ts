import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateGoalRuleSetInput, GoalType, HierarchyLevel } from '@portal/shared';
import { api } from '../lib/api';

export interface GoalRuleSetRow {
  id: string;
  scope_level: HierarchyLevel;
  company_id: string | null;
  zone_id: string | null;
  station_id: string | null;
  valid_during: string;
  mode: 'pool_weighted' | 'fixed_per_kpi';
  pool_amount: string;
  created_at: string;
}

export interface GoalRuleRow {
  id: string;
  kpi_category_id: string;
  kpi_code: string;
  kpi_name: string;
  weight: string | null;
  goal_type: GoalType;
  target_value: string;
  min_amount: string | null;
  min_threshold_pct: string | null;
  max_payout_pct: string;
  comparator: 'gte' | 'lte' | null;
  threshold_value: string | null;
  payout_amount: string | null;
}

export function useGoalRuleSets(scopeLevel?: HierarchyLevel) {
  return useQuery({
    queryKey: ['goal-rule-sets', scopeLevel],
    queryFn: () => api.get<GoalRuleSetRow[]>('/goal-rule-sets', scopeLevel ? { scopeLevel } : undefined),
  });
}

export function useGoalRuleSetDetail(ruleSetId: string | null) {
  return useQuery({
    queryKey: ['goal-rule-set', ruleSetId],
    queryFn: () => api.get<{ ruleSet: GoalRuleSetRow; rules: GoalRuleRow[] }>(`/goal-rule-sets/${ruleSetId}`),
    enabled: Boolean(ruleSetId),
  });
}

export function useCreateGoalRuleSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalRuleSetInput) => api.post<GoalRuleSetRow>('/admin/goal-rule-sets', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-rule-sets'] });
      queryClient.invalidateQueries({ queryKey: ['goal-rule-set'] });
    },
  });
}

export function useEndGoalRuleSetValidity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, validTo }: { id: string; validTo: string }) =>
      api.patch<GoalRuleSetRow>(`/admin/goal-rule-sets/${id}/end-validity`, { validTo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goal-rule-sets'] }),
  });
}
