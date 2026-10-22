import type { CreateIntegrationCredentialInput } from '@portal/shared';
import { db } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../utils/httpErrors.js';
import { decryptSecret, encryptSecret } from '../crypto/encryption.js';
import { integrationAdapters } from './registry.js';
import type { PreviewRecord } from './types.js';

const PUBLIC_COLUMNS = [
  'id',
  'provider',
  'company_id',
  'config',
  'cron_expression',
  'enabled',
  'last_tested_at',
  'last_test_success',
  'last_test_message',
  'created_at',
  'updated_at',
] as const;

export function listCredentials() {
  return db.selectFrom('integration_credentials').select(PUBLIC_COLUMNS).orderBy('provider').execute();
}

export async function getCredential(id: string) {
  const credential = await db
    .selectFrom('integration_credentials')
    .select(PUBLIC_COLUMNS)
    .where('id', '=', id)
    .executeTakeFirst();
  if (!credential) throw new NotFoundError('No se encontró la credencial');
  return credential;
}

/** Never returns the secret ciphertext, iv, or auth tag to callers outside this module. */
export async function createCredential(input: CreateIntegrationCredentialInput, userId: string) {
  const encrypted = encryptSecret(input.secret);
  return db
    .insertInto('integration_credentials')
    .values({
      provider: input.provider,
      company_id: input.companyId,
      secret_ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: encrypted.keyVersion,
      config: JSON.stringify(input.config),
      cron_expression: input.cronExpression,
      enabled: input.enabled,
      created_by: userId,
    })
    .returning(PUBLIC_COLUMNS)
    .executeTakeFirstOrThrow();
}

export interface UpdateCredentialInput {
  secret?: string | undefined;
  config?: Record<string, unknown> | undefined;
  cronExpression?: string | undefined;
  enabled?: boolean | undefined;
}

export async function updateCredential(id: string, input: UpdateCredentialInput) {
  const patch: Record<string, unknown> = {};
  if (input.secret !== undefined) {
    const encrypted = encryptSecret(input.secret);
    patch.secret_ciphertext = encrypted.ciphertext;
    patch.iv = encrypted.iv;
    patch.auth_tag = encrypted.authTag;
    patch.key_version = encrypted.keyVersion;
  }
  if (input.config !== undefined) patch.config = JSON.stringify(input.config);
  if (input.cronExpression !== undefined) patch.cron_expression = input.cronExpression;
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  patch.updated_at = new Date();

  const updated = await db
    .updateTable('integration_credentials')
    .set(patch)
    .where('id', '=', id)
    .returning(PUBLIC_COLUMNS)
    .executeTakeFirst();
  if (!updated) throw new NotFoundError('No se encontró la credencial');
  return updated;
}

export async function getCredentialWithSecret(id: string) {
  const credential = await db
    .selectFrom('integration_credentials')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (!credential) throw new NotFoundError('No se encontró la credencial');

  const secret = decryptSecret({
    ciphertext: credential.secret_ciphertext,
    iv: credential.iv,
    authTag: credential.auth_tag,
  });
  return { credential, secret };
}

export async function testConnection(id: string) {
  const { credential, secret } = await getCredentialWithSecret(id);
  const adapter = integrationAdapters[credential.provider];
  const outcome = await adapter.testConnection(secret, (credential.config ?? {}) as Record<string, unknown>);

  await db
    .updateTable('integration_credentials')
    .set({
      last_tested_at: new Date(),
      last_test_success: outcome.success,
      last_test_message: outcome.message,
    })
    .where('id', '=', id)
    .execute();

  return outcome;
}

export async function previewCredential(id: string, options: { period?: string | undefined; limit?: number | undefined }) {
  const { credential, secret } = await getCredentialWithSecret(id);
  const adapter = integrationAdapters[credential.provider];
  if (!adapter.preview) throw new NotFoundError('Este proveedor no tiene vista previa');
  let rows: PreviewRecord[];
  try {
    rows = await adapter.preview(secret, (credential.config ?? {}) as Record<string, unknown>, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const friendly =
      /[áéíóúñ]/i.test(message) || message.startsWith('Nexus no pudo entregar la vista previa')
        ? message
        : 'No se pudieron leer los datos. Revisa la conexión.';
    throw new ValidationError(friendly);
  }
  const refs = await db
    .selectFrom('station_external_refs as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .select(['r.external_id', 'r.station_id', 's.name as station_name'])
    .where('r.provider', '=', credential.provider)
    .execute();
  const stations = await db.selectFrom('stations').select(['id', 'code', 'name']).where('active', '=', true).execute();
  const byExternal = new Map(refs.map((ref) => [ref.external_id.trim().toLowerCase(), ref]));
  const byCode = new Map<string, { station_id: string; station_name: string } | null>();
  for (const station of stations) {
    const code = station.code.trim();
    if (byCode.has(code)) byCode.set(code, null);
    else byCode.set(code, { station_id: station.id, station_name: station.name });
  }
  return rows.map((row) => {
    const key = row.externalStationId.trim();
    const match = byExternal.get(key.toLowerCase()) ?? byCode.get(key) ?? null;
    return {
      ...row,
      stationId: match?.station_id ?? null,
      stationName: match?.station_name ?? null,
      mapped: Boolean(match),
    };
  });
}
