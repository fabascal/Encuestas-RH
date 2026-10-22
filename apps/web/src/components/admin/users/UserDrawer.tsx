import { useEffect, useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { STATION_MANAGER_ROLE } from '@portal/shared';
import { useAuth } from '../../../context/AuthContext';
import { useCreateUser, useUpdateUser, useUserScopes } from '../../../hooks/useUsers';
import type { UserRow } from '../../../hooks/useUsers';
import { ApiError } from '../../../lib/api';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Drawer } from '../../ui/Drawer';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { useRoles } from '../../../hooks/useRoles';
import { ScopePicker, keysFromScopes, scopesFromKeys, stationKeysOnly } from './ScopePicker';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const second = parts[1]?.charAt(0) ?? '';
  return (first + second).toUpperCase() || '?';
}

export function UserDrawer({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const { showToast } = useToast();
  const { user: me } = useAuth();
  const isEdit = user !== null;
  const isSelf = me?.id === user?.id;
  const rolesQuery = useRoles();
  const scopesQuery = useUserScopes(user?.id ?? null);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [email, setEmail] = useState(user?.email ?? '');
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(user?.role_id ?? '');
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [scopesReady, setScopesReady] = useState(!isEdit);
  const [scopeError, setScopeError] = useState('');

  useEffect(() => {
    if (!isEdit || !scopesQuery.data || scopesReady) return;
    setKeys(keysFromScopes(scopesQuery.data));
    setScopesReady(true);
  }, [isEdit, scopesQuery.data, scopesReady]);

  const selectedRole = (rolesQuery.data ?? []).find((role) => role.id === roleId);
  const seesEverything = selectedRole?.permissions.includes('alcance.total') ?? false;
  const stationManager = selectedRole?.code === STATION_MANAGER_ROLE;
  const pending = createUser.isPending || updateUser.isPending;
  const displayName = fullName.trim() || (isEdit ? user.full_name : 'Nuevo usuario');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const scopes = scopesFromKeys(stationManager ? stationKeysOnly(keys) : keys);
    if (!seesEverything && scopes.length === 0) {
      setScopeError('Agrega al menos un alcance');
      return;
    }
    setScopeError('');
    if (isEdit) {
      updateUser.mutate(
        { id: user.id, input: { fullName, roleId, scopes } },
        {
          onSuccess: () => {
            showToast('Usuario actualizado', 'success');
            onClose();
          },
          onError: (error) => showToast(error instanceof ApiError ? error.message : 'No se pudo guardar el usuario', 'danger'),
        },
      );
      return;
    }
    createUser.mutate(
      { email, fullName, password, roleId, scopes },
      {
        onSuccess: () => {
          showToast('Usuario creado', 'success');
          onClose();
        },
        onError: (error) => showToast(error instanceof ApiError ? error.message : 'No se pudo crear el usuario', 'danger'),
      },
    );
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      banner={
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
            <p className="truncate text-xs text-muted">{email || 'Sin correo todavía'}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {selectedRole && <Badge tone="brand">{selectedRole.name}</Badge>}
              {isEdit && <Badge tone={user.active ? 'success' : 'neutral'}>{user.active ? 'Activo' : 'Inactivo'}</Badge>}
            </div>
          </div>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="user-drawer-form" type="submit" isLoading={pending} disabled={isEdit && !scopesReady}>
            <FloppyDisk size={18} aria-hidden />
            Guardar
          </Button>
        </>
      }
    >
      <form id="user-drawer-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Correo"
          type="email"
          required
          readOnly={isEdit}
          disabled={isEdit}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input label="Nombre completo" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
        {!isEdit && (
          <Input
            label="Contraseña"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        <Select
          label="Rol"
          required
          disabled={isSelf}
          placeholder="Selecciona"
          value={roleId}
          onChange={(event) => {
            const nextRoleId = event.target.value;
            setRoleId(nextRoleId);
            if ((rolesQuery.data ?? []).find((role) => role.id === nextRoleId)?.code === STATION_MANAGER_ROLE) {
              setKeys((prev) => stationKeysOnly(prev));
            }
          }}
          options={(rolesQuery.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
        />
        {isSelf && <p className="text-xs text-muted">No puedes cambiar tu propio rol</p>}
        {seesEverything ? (
          <p className="rounded-card bg-bg px-3 py-3 text-sm text-muted">
            Este rol ve todas las empresas, zonas y estaciones
          </p>
        ) : !scopesReady ? (
          <p className="text-sm text-muted">Cargando alcance…</p>
        ) : (
          <ScopePicker
            value={keys}
            onChange={setKeys}
            stationOnly={stationManager}
            currentUserId={user?.id ?? null}
          />
        )}
        {scopeError && <p className="text-sm text-danger">{scopeError}</p>}
      </form>
    </Drawer>
  );
}
