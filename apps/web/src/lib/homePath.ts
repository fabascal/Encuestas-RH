import type { Permission } from '@portal/shared';
import { ADMIN_SECTIONS } from '../pages/admin/adminNav';

export function homePath(can: (permission: Permission) => boolean): string {
  if (can('panel.ver')) return '/';
  if (can('direccion.ver')) return '/direccion';
  if (can('reportes.ver')) return '/reportes';
  if (can('origen.ver') || can('origen.gestionar')) return '/origen/google';
  const admin = ADMIN_SECTIONS.find((section) => can(section.permission));
  return admin?.to ?? '/sin-acceso';
}
