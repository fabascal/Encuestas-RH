import { useMemo, useState } from 'react';
import { FloppyDisk, Plus } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import type { Permission } from '@portal/shared';
import { useCreateRole, useDeleteRole, usePermissions, useRoles, useUpdateRole } from '../../hooks/useRoles';
import type { RoleRow } from '../../hooks/useRoles';
import { ApiError } from '../../lib/api';
import { buildPermissionGroups } from '../../lib/permissionGroups';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { IconTile } from '../../components/ui/IconTile';
import { ADMIN_ICONS } from '../../lib/icons';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';

function RoleForm({ role, onClose }: { role: RoleRow | null; onClose: () => void }) {
  const { showToast } = useToast();
  const permissionsQuery = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<Permission[]>(role?.permissions ?? []);
  const readOnly = role?.code === 'admin';

  const groups = useMemo(() => buildPermissionGroups(permissionsQuery.data ?? []), [permissionsQuery.data]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    const input = { name, description: description || null, permissions: selected };
    const onSuccess = () => {
      showToast(role ? 'Rol actualizado' : 'Rol creado', 'success');
      onClose();
    };
    const onError = (error: unknown) =>
      showToast(error instanceof ApiError ? error.message : 'No se pudo guardar el rol', 'danger');
    if (role) updateRole.mutate({ id: role.id, input }, { onSuccess, onError });
    else createRole.mutate(input, { onSuccess, onError });
  };

  const toggle = (code: Permission) => {
    setSelected((current) => {
      const has = current.includes(code);
      if (code === 'reportes.exportar' && !has) {
        return current.includes('reportes.ver') ? [...current, code] : [...current, 'reportes.ver', code];
      }
      if (code === 'origen.gestionar' && !has) {
        return current.includes('origen.ver') ? [...current, code] : [...current, 'origen.ver', code];
      }
      if (code === 'reportes.ver' && has) {
        return current.filter((item) => item !== 'reportes.ver' && item !== 'reportes.exportar');
      }
      if (code === 'origen.ver' && has) {
        return current.filter((item) => item !== 'origen.ver' && item !== 'origen.gestionar');
      }
      return has ? current.filter((item) => item !== code) : [...current, code];
    });
  };

  const toggleGroup = (codes: Permission[]) => {
    setSelected((current) => {
      const allOn = codes.every((code) => current.includes(code));
      if (allOn) return current.filter((item) => !codes.includes(item));
      const next = new Set(current);
      for (const code of codes) next.add(code);
      if (next.has('reportes.exportar')) next.add('reportes.ver');
      if (next.has('origen.gestionar')) next.add('origen.ver');
      return [...next];
    });
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={readOnly ? role?.name ?? 'Rol' : role ? 'Editar rol' : 'Nuevo rol'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {!readOnly && (
            <Button form="role-form" type="submit" isLoading={createRole.isPending || updateRole.isPending}>
              <FloppyDisk size={18} aria-hidden />
              Guardar
            </Button>
          )}
        </>
      }
    >
      <form id="role-form" onSubmit={submit} className="flex flex-col gap-4">
        {readOnly && <p className="text-sm text-muted">El Administrador general no se puede modificar.</p>}
        {role && !readOnly && role.user_count > 0 && (
          <p className="text-sm text-muted">
            Este rol tiene {role.user_count} {role.user_count === 1 ? 'usuario' : 'usuarios'}. Los cambios aplican en su
            siguiente acción.
          </p>
        )}
        <Input label="Nombre" required value={name} disabled={readOnly} onChange={(event) => setName(event.target.value)} />
        <Input
          label="Descripción"
          value={description}
          disabled={readOnly}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const GroupIcon = group.icon;
            const codes = group.permissions.map((permission) => permission.code);
            const marked = codes.filter((code) => selected.includes(code)).length;
            return (
              <fieldset key={group.id} disabled={readOnly} className="rounded-control border border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Marcar ${group.label}`}
                    checked={marked === codes.length}
                    ref={(node) => {
                      if (node) node.indeterminate = marked > 0 && marked < codes.length;
                    }}
                    onChange={() => toggleGroup(codes)}
                  />
                  <GroupIcon size={18} aria-hidden />
                  <span className="flex-1 text-sm font-medium text-fg">{group.label}</span>
                  <span className="text-xs text-muted">
                    {marked} de {codes.length}
                  </span>
                </div>
                <div className={group.columns ? 'mt-3 grid gap-2 sm:grid-cols-2' : 'mt-3 flex flex-col gap-2'}>
                  {group.permissions.map((permission) => {
                    const PermissionIcon = permission.icon;
                    return (
                      <label key={permission.code} className="flex items-start gap-2 text-sm text-fg">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selected.includes(permission.code)}
                          onChange={() => toggle(permission.code)}
                        />
                        <span>
                          <span className="flex items-center gap-1.5 font-medium">
                            {PermissionIcon && <PermissionIcon size={16} aria-hidden />}
                            {permission.label}
                          </span>
                          <span className="block text-xs text-muted">{permission.help}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}

export function RolesPage() {
  const { showToast } = useToast();
  const rolesQuery = useRoles();
  const deleteRole = useDeleteRole();
  const [editing, setEditing] = useState<RoleRow | null | undefined>(undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={ADMIN_ICONS.roles} size="sm" />}>Roles y permisos</CardTitle>
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus size={16} aria-hidden />
          Nuevo rol
        </Button>
      </CardHeader>
      <Table
        columns={[
          { key: 'name', header: 'Rol', render: (row) => row.name },
          { key: 'users', header: 'Usuarios', render: (row) => row.user_count },
          {
            key: 'type',
            header: 'Tipo',
            render: (row) => <Badge tone={row.is_system ? 'neutral' : 'brand'}>{row.is_system ? 'Sistema' : 'Personalizado'}</Badge>,
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                  {row.code === 'admin' ? 'Ver' : 'Editar'}
                </Button>
                {!row.is_system && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      deleteRole.mutate(row.id, {
                        onSuccess: () => showToast('Rol eliminado', 'success'),
                        onError: (error) =>
                          showToast(error instanceof ApiError ? error.message : 'No se pudo eliminar', 'danger'),
                      })
                    }
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={rolesQuery.data ?? []}
        getRowKey={(row) => row.id}
        emptyMessage="Sin roles"
      />
      {editing !== undefined && <RoleForm role={editing} onClose={() => setEditing(undefined)} />}
    </Card>
  );
}
