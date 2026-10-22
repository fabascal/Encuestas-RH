import { useState } from 'react';
import type { FormEvent } from 'react';
import { ChartLineUp, EnvelopeSimple, FileText, LockSimple, Wallet } from '@phosphor-icons/react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const HIGHLIGHTS = [
  { title: 'KPIs', detail: 'Semáforos por rubro', icon: ChartLineUp },
  { title: 'Bonos', detail: 'Cálculo del periodo', icon: Wallet },
  { title: 'Reportes', detail: 'PDF y Excel', icon: FileText },
] as const;

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <img
          src="/estacion-ener.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-fg/75" />
        <div className="relative flex h-full flex-col justify-center px-14 text-on-brand">
          <p className="max-w-md text-3xl font-semibold tracking-tight">Portal de KPIs y bonos</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-on-brand/80">
            Revisa indicadores, metas y el cálculo de bonos de cada estación para dar seguimiento al periodo.
          </p>
          <ul className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title}>
                <item.icon size={22} aria-hidden />
                <p className="mt-3 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-snug text-on-brand/75">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <img
            src="/combu-express-logo.jpg"
            alt="Combu Express"
            className="mx-auto h-16 w-auto rounded-card border border-border bg-surface object-contain px-4 py-2 shadow-sm"
          />

          <h1 className="mt-8 text-center text-xl font-semibold text-fg">Iniciar sesión</h1>
          <p className="mt-1 text-center text-sm text-muted">
            Ingresa tus credenciales para acceder al portal.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              required
              icon={<EnvelopeSimple size={18} aria-hidden />}
              className="rounded-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              icon={<LockSimple size={18} aria-hidden />}
              className="rounded-full"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full rounded-full">
              Ingresar al portal
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
