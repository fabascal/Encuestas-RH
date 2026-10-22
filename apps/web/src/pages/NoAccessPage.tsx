import { ShieldWarning } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { IconTile } from '../components/ui/IconTile';
import { useAuth } from '../context/AuthContext';

export function NoAccessPage() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <IconTile icon={ShieldWarning} size="lg" tone="warning" />
      <h1 className="text-2xl font-semibold text-fg">Sin acceso</h1>
      <p className="max-w-md text-sm text-muted">
        Tu rol todavía no tiene páginas asignadas. Pide a un administrador que te dé permisos.
      </p>
      <Button variant="secondary" onClick={() => void logout()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
