import type { Icon } from '@phosphor-icons/react';
import type { Permission } from '@portal/shared';
import { ADMIN_ICONS } from '../../lib/icons';

export interface AdminSection {
  to: string;
  label: string;
  permission: Permission;
  icon: Icon;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { to: '/admin/organizacion', label: 'Organización', permission: 'organizacion.gestionar', icon: ADMIN_ICONS.organizacion },
  { to: '/admin/usuarios', label: 'Usuarios', permission: 'usuarios.gestionar', icon: ADMIN_ICONS.usuarios },
  { to: '/admin/roles', label: 'Roles', permission: 'roles.gestionar', icon: ADMIN_ICONS.roles },
  { to: '/admin/reglas', label: 'Reglas de bono', permission: 'reglas.gestionar', icon: ADMIN_ICONS.reglas },
  { to: '/admin/captura', label: 'Captura manual', permission: 'captura.gestionar', icon: ADMIN_ICONS.captura },
  { to: '/admin/integraciones', label: 'Integraciones', permission: 'integraciones.gestionar', icon: ADMIN_ICONS.integraciones },
];
