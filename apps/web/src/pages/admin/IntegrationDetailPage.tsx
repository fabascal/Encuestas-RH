import { Link, NavLink, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { IconTile } from '../../components/ui/IconTile';
import { INTEGRATION_TAB_ICONS, PROVIDER_ICONS } from '../../lib/icons';
import { INTEGRATION_PROVIDERS } from '@portal/shared';
import type { IntegrationProvider } from '@portal/shared';
import { ConnectionForm } from '../../components/admin/integrations/ConnectionForm';
import { ConnectionTest } from '../../components/admin/integrations/ConnectionTest';
import { StationMapping } from '../../components/admin/integrations/StationMapping';
import { SyncCalendar } from '../../components/admin/integrations/SyncCalendar';
import { SyncHistory } from '../../components/admin/integrations/SyncHistory';
import { SyncNow } from '../../components/admin/integrations/SyncNow';
import { WebhookResponses } from '../../components/admin/integrations/WebhookResponses';
import { PROVIDER_LABELS } from '../../components/admin/integrations/providers';

const TABS = [
  { id: 'conexion', label: 'Conexión' },
  { id: 'prueba', label: 'Prueba' },
  { id: 'sincronizar', label: 'Sincronizar' },
  { id: 'mapeo', label: 'Mapeo de estaciones' },
  { id: 'historial', label: 'Historial' },
] as const;

function TabGlyph({ id }: { id: string }) {
  if (!(id in INTEGRATION_TAB_ICONS)) return null;
  const Glyph = INTEGRATION_TAB_ICONS[id as keyof typeof INTEGRATION_TAB_ICONS];
  return <Glyph size={16} aria-hidden />;
}

function isProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function IntegrationDetailPage() {
  const { provider: providerParam, tab } = useParams();
  if (!providerParam || !isProvider(providerParam)) return <Navigate to="/admin/integraciones" replace />;
  const provider = providerParam;
  const tabs =
    provider === 'nexus_fuel'
      ? [
          ...TABS.slice(0, 3),
          { id: 'calendario', label: 'Calendario' },
          ...TABS.slice(3),
        ]
      : provider === 'google_forms'
        ? [
            ...TABS.slice(0, 3),
            { id: 'respuestas', label: 'Respuestas' },
            ...TABS.slice(3),
          ]
        : TABS;
  const current = tabs.some((item) => item.id === tab) ? tab : 'conexion';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          to="/admin/integraciones"
          className="inline-flex h-9 w-fit items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-medium text-fg hover:bg-bg"
        >
          <ArrowLeft size={16} />
          Todas las integraciones
        </Link>
        <div>
          <p className="text-sm text-muted">Integraciones</p>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
            <IconTile icon={PROVIDER_ICONS[provider]} size="sm" />
            {PROVIDER_LABELS[provider]}
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <NavLink
            key={item.id}
            to={`/admin/integraciones/${provider}/${item.id}`}
            className={({ isActive }) =>
              [
                'inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium',
                isActive || current === item.id ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-bg',
              ].join(' ')
            }
          >
            <TabGlyph id={item.id} />
            {item.label}
          </NavLink>
        ))}
      </div>
      {current === 'conexion' && <ConnectionForm provider={provider} />}
      {current === 'prueba' && <ConnectionTest provider={provider} />}
      {current === 'sincronizar' && <SyncNow provider={provider} />}
      {current === 'respuestas' && <WebhookResponses />}
      {current === 'calendario' && <SyncCalendar provider={provider} />}
      {current === 'mapeo' && <StationMapping provider={provider} />}
      {current === 'historial' && <SyncHistory provider={provider} />}
    </div>
  );
}
