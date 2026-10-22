import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRoleInput, Permission } from '@portal/shared';
import { api } from '../lib/api';

export interface PermissionRow {
  code: Permission;
  name: string;
  group_name: string;
}

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count: number;
  permissions: Permission[];
}

export function usePermissions() {
  return useQuery({ queryKey: ['permissions'], queryFn: () => api.get<PermissionRow[]>('/admin/permissions') });
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => api.get<RoleRow[]>('/admin/roles') });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<RoleRow>('/admin/roles', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateRoleInput }) => api.patch<RoleRow>(`/admin/roles/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });
}
