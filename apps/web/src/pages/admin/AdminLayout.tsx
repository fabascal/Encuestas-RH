import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homePath } from '../../lib/homePath';
import { ADMIN_SECTIONS } from './adminNav';

export function AdminLayout() {
  return <Outlet />;
}

export function AdminHome() {
  const { can } = useAuth();
  const first = ADMIN_SECTIONS.find((section) => can(section.permission));
  return <Navigate to={first?.to ?? homePath(can)} replace />;
}
