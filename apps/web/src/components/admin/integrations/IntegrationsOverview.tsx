import { Link } from 'react-router-dom';
import { SYNC_STATUS_LABELS } from '@portal/shared';
import type { SyncStatus } from '@portal/shared';
import { useCredentials, useStationRefs, useSyncRuns } from '../../../hooks/useIntegrations';
import { Badge } from '../../ui/Badge';
import { Card, CardTitle } from '../../ui/Card';
import { IconTile } from '../../ui/IconTile';
import { PROVIDER_ICONS } from '../../../lib/icons';
import { PROVIDER_LABELS, PROVIDER_ORDER } from './providers';

function ProviderCard({ provider }: { provider: (typeof PROVIDER_ORDER)[number] }) {
  const credentialsQuery = useCredentials();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;
  const refsQuery = useStationRefs(provider);
  const runsQuery = useSyncRuns(credential ? { credentialId: credential.id, limit: 1 } : { provider, limit: 1 });
  const lastRun = runsQuery.data?.[0];
  const status = lastRun?.status as SyncStatus | undefined;

  return (
    <Link to={`/admin/integraciones/${provider}/conexion`} className="block">
      <Card className="flex h-full flex-col gap-3 transition-colors hover:border-brand">
        <CardTitle icon={<IconTile icon={PROVIDER_ICONS[provider]} size="sm" />}>{PROVIDER_LABELS[provider]}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge tone={credential?.enabled ? 'success' : 'neutral'}>{credential?.enabled ? 'Activa' : 'Inactiva'}</Badge>
          {credential?.last_test_success !== null && credential?.last_test_success !== undefined && (
            <Badge tone={credential.last_test_success ? 'success' : 'danger'}>
              {credential.last_test_success ? 'Última prueba correcta' : 'Última prueba fallida'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted">
          Última sincronización:{' '}
          {lastRun
            ? `${status && status in SYNC_STATUS_LABELS ? SYNC_STATUS_LABELS[status] : lastRun.status} · ${new Date(lastRun.created_at).toLocaleString('es-MX')}`
            : 'sin registros'}
        </p>
        <p className="text-sm text-muted">Estaciones ligadas: {refsQuery.data?.length ?? 0}</p>
      </Card>
    </Link>
  );
}

export function IntegrationsOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDER_ORDER.map((provider) => (
        <ProviderCard key={provider} provider={provider} />
      ))}
    </div>
  );
}
