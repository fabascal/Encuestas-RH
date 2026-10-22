import { useEffect, useMemo, useState } from 'react';
import { FloppyDisk, Plug, Plus } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { cronFromHours, hoursFromCron } from '@portal/shared';
import type { IntegrationProvider } from '@portal/shared';
import { useCompanies } from '../../../hooks/useHierarchy';
import { useCreateCredential, useCredentials, useUpdateCredential } from '../../../hooks/useIntegrations';
import { ApiError } from '../../../lib/api';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle } from '../../ui/Card';
import { IconTile } from '../../ui/IconTile';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { useToast } from '../../ui/Toast';
import { CONFIG_FIELDS, PROVIDER_LABELS } from './providers';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

function applyHourList(hours: number[]): { hours: number[]; cron: string } {
  const next = hours.length > 0 ? hours : [3];
  return { hours: next, cron: cronFromHours(next) };
}

function stringConfig(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value : '';
}

export function ConnectionForm({ provider }: { provider: IntegrationProvider }) {
  const { showToast } = useToast();
  const credentialsQuery = useCredentials();
  const companiesQuery = useCompanies();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const credential = (credentialsQuery.data ?? []).find((row) => row.provider === provider) ?? null;

  const [values, setValues] = useState<Record<string, string>>({});
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'hours' | 'custom'>('hours');
  const [hours, setHours] = useState<number[]>([3]);
  const [hourToAdd, setHourToAdd] = useState('8');
  const [cron, setCron] = useState('0 3 * * *');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!credential) {
      if (provider === 'nexus_fuel') {
        setValues({ baseUrl: 'https://combuapiv2.nexusfuel.com' });
        const schedule = applyHourList([3, 12, 20]);
        setHours(schedule.hours);
        setCron(schedule.cron);
        setScheduleMode('hours');
      }
      return;
    }
    const next: Record<string, string> = {};
    for (const field of CONFIG_FIELDS[provider]) next[field.key] = stringConfig(credential.config, field.key);
    if (provider === 'nexus_fuel' && !next.baseUrl) next.baseUrl = 'https://combuapiv2.nexusfuel.com';
    setValues(next);
    setCron(credential.cron_expression);
    const parsed = hoursFromCron(credential.cron_expression);
    if (parsed) {
      setScheduleMode('hours');
      setHours(parsed);
    } else {
      setScheduleMode('custom');
    }
    setEnabled(credential.enabled);
  }, [credential, provider]);

  const chooseHours = (nextHours: number[]) => {
    const schedule = applyHourList(nextHours);
    setHours(schedule.hours);
    setCron(schedule.cron);
    setScheduleMode('hours');
  };

  const fields = CONFIG_FIELDS[provider];
  const secretLabel = useMemo(() => {
    if (provider === 'google_forms') return 'Archivo de la cuenta de servicio';
    return 'Clave de acceso';
  }, [provider]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const config: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.key]?.trim();
      if (value) config[field.key] = value;
    }
    const secretValue =
      provider === 'nexus_fuel'
        ? username || password
          ? JSON.stringify({ username, password })
          : ''
        : secret.trim();

    const onSuccess = () => showToast('Conexión guardada', 'success');
    const onError = (error: unknown) =>
      showToast(error instanceof ApiError ? error.message : 'No se pudo guardar la conexión', 'danger');

    if (credential) {
      updateCredential.mutate(
        {
          id: credential.id,
          input: {
            config,
            cronExpression: cron,
            enabled,
            ...(secretValue ? { secret: secretValue } : {}),
          },
        },
        { onSuccess, onError },
      );
      return;
    }

    if (!secretValue) {
      showToast('Indica la clave de acceso para crear la conexión', 'danger');
      return;
    }
    const companyId = companiesQuery.data?.[0]?.id ?? null;
    createCredential.mutate(
      { provider, companyId, secret: secretValue, config, cronExpression: cron, enabled },
      { onSuccess, onError },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={Plug} size="sm" />}>Conexión · {PROVIDER_LABELS[provider]}</CardTitle>
      </CardHeader>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            {...(field.hint ? { hint: field.hint } : {})}
            value={values[field.key] ?? ''}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ))}
        {provider === 'nexus_fuel' ? (
          <>
            <Input label="Usuario" value={username} autoComplete="off" onChange={(event) => setUsername(event.target.value)} />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              autoComplete="new-password"
              hint="Déjala vacía para conservar la actual"
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
            <span className="font-medium text-fg">{secretLabel}</span>
            <textarea
              className="min-h-28 rounded-control border border-border bg-surface px-3 py-2 text-fg"
              value={secret}
              placeholder={credential ? 'Vacío conserva la clave actual' : ''}
              onChange={(event) => setSecret(event.target.value)}
            />
          </label>
        )}
        <div className="flex flex-col gap-3 md:col-span-2">
          <div>
            <p className="text-sm font-medium text-fg">Horarios del día</p>
            <p className="text-sm text-muted">Hora de México. Cada horario vuelve a consultar el día anterior.</p>
          </div>
          {scheduleMode === 'hours' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand"
                    onClick={() => chooseHours(hours.filter((item) => item !== hour))}
                  >
                    {String(hour).padStart(2, '0')}:00 ×
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Select
                  label="Agregar hora"
                  value={hourToAdd}
                  options={HOUR_OPTIONS}
                  onChange={(event) => setHourToAdd(event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => chooseHours([...hours, Number(hourToAdd)])}
                >
                  <Plus size={16} aria-hidden />
                  Agregar
                </Button>
                {provider === 'nexus_fuel' && (
                  <Button type="button" variant="ghost" onClick={() => chooseHours([3, 12, 20])}>
                    Usar 3:00, 12:00 y 20:00
                  </Button>
                )}
              </div>
              <button type="button" className="w-fit text-sm font-medium text-brand" onClick={() => setScheduleMode('custom')}>
                Horario personalizado
              </button>
            </>
          ) : (
            <>
              <Input label="Expresión de horario" value={cron} onChange={(event) => setCron(event.target.value)} />
              <button type="button" className="w-fit text-sm font-medium text-brand" onClick={() => chooseHours(hours)}>
                Elegir horas
              </button>
            </>
          )}
        </div>
        <div className="md:col-span-2">
          <Switch checked={enabled} onChange={setEnabled} label="Activa" />
        </div>
        <div>
          <Button type="submit" isLoading={createCredential.isPending || updateCredential.isPending}>
            <FloppyDisk size={18} aria-hidden />
            Guardar conexión
          </Button>
        </div>
      </form>
    </Card>
  );
}
