import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Permission } from '@portal/shared';
import { useAuth } from '../../context/AuthContext';
import { homePath } from '../../lib/homePath';
import { Spinner } from '../ui/Spinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission | readonly Permission[];
  children: ReactNode;
}) {
  const { can } = useAuth();
  const required = typeof permission === 'string' ? [permission] : permission;
  const allowed = required.some((item) => can(item));
  if (!allowed) return <Navigate to={homePath(can)} replace />;
  return <>{children}</>;
}
