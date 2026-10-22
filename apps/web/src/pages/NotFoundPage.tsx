import { MapPinLine } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { IconTile } from '../components/ui/IconTile';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <IconTile icon={MapPinLine} size="lg" tone="warning" />
      <h1 className="text-2xl font-semibold text-fg">Pagina no encontrada</h1>
      <p className="text-sm text-muted">La direccion que buscas no existe o fue movida.</p>
      <Link to="/">
        <Button>Volver al panel</Button>
      </Link>
    </div>
  );
}
