import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserInput, UpdateUserInput } from '@portal/shared';
import { api } from '../lib/api';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  active: boolean;
  created_at: string;
}

export interface UserScopeRow {
  id: string;
  user_id: string;
  company_id: string | null;
  zone_id: string | null;
  station_id: string | null;
}

export function useUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: () => api.get<UserRow[]>('/admin/users') });
}

export interface StationManagerRow {
  stationId: string;
  userId: string;
  fullName: string;
}

export function useStationManagers() {
  return useQuery({
    queryKey: ['admin-station-managers'],
    queryFn: () => api.get<StationManagerRow[]>('/admin/station-managers'),
  });
}

export function useUserScopes(userId: string | null) {
  return useQuery({
    queryKey: ['admin-user-scopes', userId],
    queryFn: () => api.get<UserScopeRow[]>(`/admin/users/${userId}/scopes`),
    enabled: Boolean(userId),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<UserRow>('/admin/users', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-station-managers'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      api.patch<UserRow>(`/admin/users/${id}`, input),
    onSuccess: (_user, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-user-scopes', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-station-managers'] });
    },
  });
}

export function useForceLogout() {
  return useMutation({ mutationFn: (userId: string) => api.post(`/admin/users/${userId}/force-logout`) });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      api.post(`/admin/users/${userId}/reset-password`, { newPassword }),
  });
}
