import { useState } from 'react';
import { FloppyDisk, Plus } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useForceLogout, useResetPassword, useUpdateUser, useUsers } from '../../hooks/useUsers';
import type { UserRow } from '../../hooks/useUsers';
import { ApiError } from '../../lib/api';
import { UserDrawer } from './users/UserDrawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { ADMIN_ICONS } from '../../lib/icons';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { Table } from '../ui/Table';
import { useToast } from '../ui/Toast';

function UserRowActions({ user, onEdit }: { user: UserRow; onEdit: () => void }) {
  const { showToast } = useToast();
  const { user: me } = useAuth();
  const updateUser = useUpdateUser();
  const forceLogout = useForceLogout();
  const resetPassword = useResetPassword();
  const [newPassword, setNewPassword] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Switch
        checked={user.active}
        disabled={me?.id === user.id}
        onChange={(active) =>
          updateUser.mutate(
            { id: user.id, input: { active } },
            {
              onSuccess: () => showToast(active ? 'Usuario activado' : 'Usuario desactivado', 'success'),
              onError: (error) =>
                showToast(error instanceof ApiError ? error.message : 'No se pudo actualizar el usuario', 'danger'),
            },
          )
        }
      />
      <Button size="sm" variant="secondary" onClick={onEdit}>
        Editar
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
        Restablecer contraseña
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          forceLogout.mutate(user.id, { onSuccess: () => showToast('Sesiones cerradas', 'success') })
        }
      >
        Cerrar sesiones
      </Button>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Restablecer contraseña - ${user.full_name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              isLoading={resetPassword.isPending}
              onClick={() =>
                resetPassword.mutate(
                  { userId: user.id, newPassword },
                  {
                    onSuccess: () => {
                      showToast('Contrasena actualizada', 'success');
                      setNewPassword('');
                      setResetOpen(false);
                    },
                  },
                )
              }
            >
              <FloppyDisk size={18} aria-hidden />
              Guardar
            </Button>
          </>
        }
      >
        <Input
          label="Nueva contrasena"
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Modal>
    </div>
  );
}

export function UsersManager() {
  const usersQuery = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={ADMIN_ICONS.usuarios} size="sm" />}>Usuarios</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} aria-hidden />
          Nuevo usuario
        </Button>
      </CardHeader>

      <Table
        columns={[
          { key: 'name', header: 'Nombre', render: (row) => row.full_name },
          { key: 'email', header: 'Correo', render: (row) => row.email },
          { key: 'role', header: 'Rol', render: (row) => <Badge tone="brand">{row.role_name}</Badge> },
          { key: 'actions', header: '', render: (row) => <UserRowActions user={row} onEdit={() => setEditing(row)} /> },
        ]}
        rows={usersQuery.data ?? []}
        getRowKey={(row) => row.id}
        emptyMessage="Sin usuarios registrados"
      />

      {(createOpen || editing) && (
        <UserDrawer key={editing?.id ?? 'new'} user={editing} onClose={() => { setCreateOpen(false); setEditing(null); }} />
      )}
    </Card>
  );
}
