import type { IntegrationProvider } from '@portal/shared';

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  google_forms: 'Encuestas (Google Sheets)',
  nexus_fuel: 'Nexus (venta de aceite)',
  nomina3: 'Nómina',
  sispa: 'SISPA',
};

export const PROVIDER_ORDER: IntegrationProvider[] = ['nexus_fuel', 'sispa', 'nomina3', 'google_forms'];

export interface ConfigField {
  key: string;
  label: string;
  hint?: string;
}

export const CONFIG_FIELDS: Record<IntegrationProvider, ConfigField[]> = {
  nexus_fuel: [
    {
      key: 'baseUrl',
      label: 'Dirección del servicio',
      hint: 'Por ejemplo https://combuapiv2.nexusfuel.com',
    },
  ],
  google_forms: [
    { key: 'spreadsheetId', label: 'Identificador del libro' },
    { key: 'sheetName', label: 'Nombre de la hoja' },
    { key: 'serviceAccountEmail', label: 'Correo de la cuenta de servicio' },
    { key: 'timestampColumn', label: 'Columna de fecha' },
    { key: 'emailColumn', label: 'Columna de correo' },
    { key: 'scoreColumn', label: 'Columna de puntuación' },
    { key: 'stationColumn', label: 'Columna de estación' },
  ],
  nomina3: [{ key: 'baseUrl', label: 'Dirección del servicio' }],
  sispa: [{ key: 'baseUrl', label: 'Dirección del servicio' }],
};

export const CRON_PRESETS = [
  { id: 'daily', label: 'Todos los días a las 3:00', value: '0 3 * * *' },
  { id: 'hourly', label: 'Cada hora', value: '0 * * * *' },
  { id: 'custom', label: 'Personalizado', value: '' },
];
