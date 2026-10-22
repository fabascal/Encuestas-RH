import type { Icon } from '@phosphor-icons/react';
import { Binoculars, CalendarBlank, ChartBar, ChartLine, Database, DotsThree, GearSix, Globe } from '@phosphor-icons/react';
import type { Permission } from '@portal/shared';
import type { PermissionRow } from '../hooks/useRoles';
import { ADMIN_ICONS } from './icons';

interface PermissionSpec {
  code: Permission;
  label: string;
  help: string;
  icon?: Icon;
}

interface GroupSpec {
  id: string;
  label: string;
  icon: Icon;
  columns: boolean;
  permissions: PermissionSpec[];
}

const GROUPS: GroupSpec[] = [
  {
    id: 'panel',
    label: 'Panel',
    icon: ChartLine,
    columns: false,
    permissions: [
      {
        code: 'panel.ver',
        label: 'Ver el panel operativo',
        help: 'KPIs del mes, aceites y simulador de bono',
      },
    ],
  },
  {
    id: 'direccion',
    label: 'Dirección',
    icon: Binoculars,
    columns: false,
    permissions: [
      {
        code: 'direccion.ver',
        label: 'Ver el panel de dirección',
        help: 'Encuestas y aceites por año',
      },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: ChartBar,
    columns: false,
    permissions: [
      { code: 'reportes.ver', label: 'Ver reportes', help: 'Resumen, cumplimiento, pagos y tendencia' },
      { code: 'reportes.exportar', label: 'Exportar reportes', help: 'Descargar en PDF y Excel' },
    ],
  },
  {
    id: 'origen',
    label: 'Origen de datos',
    icon: Database,
    columns: false,
    permissions: [
      {
        code: 'origen.ver',
        label: 'Ver el origen de datos',
        help: 'Consultar encuestas de Google Forms y la venta de Nexus',
      },
      {
        code: 'origen.gestionar',
        label: 'Ajustar el origen de datos',
        help: 'Excluir o incluir respuestas y volver a consultar Nexus',
      },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: GearSix,
    columns: true,
    permissions: [
      { code: 'organizacion.gestionar', label: 'Organización', help: 'Empresas, zonas y estaciones', icon: ADMIN_ICONS.organizacion },
      { code: 'usuarios.gestionar', label: 'Usuarios', help: 'Altas, bajas y asignación de alcance', icon: ADMIN_ICONS.usuarios },
      { code: 'roles.gestionar', label: 'Roles', help: 'Crear roles y elegir sus permisos', icon: ADMIN_ICONS.roles },
      { code: 'reglas.gestionar', label: 'Reglas de bono', help: 'Metas, bolsas y vigencias', icon: ADMIN_ICONS.reglas },
      { code: 'captura.gestionar', label: 'Captura manual', help: 'Cargar datos que no vienen de una integración', icon: ADMIN_ICONS.captura },
      { code: 'integraciones.gestionar', label: 'Integraciones', help: 'Conexiones con Google, Nexus, SISPA y nómina', icon: ADMIN_ICONS.integraciones },
      { code: 'periodos.cerrar', label: 'Cerrar periodos', help: 'Cerrar periodos del bono', icon: CalendarBlank },
    ],
  },
  {
    id: 'alcance',
    label: 'Alcance',
    icon: Globe,
    columns: false,
    permissions: [
      {
        code: 'alcance.total',
        label: 'Ver todas las empresas, zonas y estaciones',
        help: 'Sin este permiso, el usuario solo ve lo que tiene asignado',
      },
    ],
  },
];

export interface PermissionGroupView {
  id: string;
  label: string;
  icon: Icon;
  columns: boolean;
  permissions: PermissionSpec[];
}

export function buildPermissionGroups(rows: PermissionRow[]): PermissionGroupView[] {
  const available = new Set(rows.map((row) => row.code));
  const known = new Set<Permission>();
  const groups: PermissionGroupView[] = [];

  for (const group of GROUPS) {
    const permissions = group.permissions.filter((item) => available.has(item.code));
    for (const item of permissions) known.add(item.code);
    if (permissions.length > 0) {
      groups.push({ id: group.id, label: group.label, icon: group.icon, columns: group.columns, permissions });
    }
  }

  const others = rows.filter((row) => !known.has(row.code));
  if (others.length > 0) {
    groups.push({
      id: 'otros',
      label: 'Otros',
      icon: DotsThree,
      columns: false,
      permissions: others.map((row) => ({ code: row.code, label: row.name, help: row.group_name })),
    });
  }

  return groups;
}
