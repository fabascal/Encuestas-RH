import { db } from '../../db/index.js';
import { NotFoundError } from '../../utils/httpErrors.js';
import { decryptSecret, encryptSecret } from '../crypto/encryption.js';
import { integrationAdapters } from './registry.js';
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
];
export function listCredentials() {
    return db.selectFrom('integration_credentials').select(PUBLIC_COLUMNS).orderBy('provider').execute();
}
export async function getCredential(id) {
    const credential = await db
        .selectFrom('integration_credentials')
        .select(PUBLIC_COLUMNS)
        .where('id', '=', id)
        .executeTakeFirst();
    if (!credential)
        throw new NotFoundError('Integration credential not found');
    return credential;
}
/** Never returns the secret ciphertext, iv, or auth tag to callers outside this module. */
export async function createCredential(input, userId) {
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
export async function updateCredential(id, input) {
    const patch = {};
    if (input.secret !== undefined) {
        const encrypted = encryptSecret(input.secret);
        patch.secret_ciphertext = encrypted.ciphertext;
        patch.iv = encrypted.iv;
        patch.auth_tag = encrypted.authTag;
        patch.key_version = encrypted.keyVersion;
    }
    if (input.config !== undefined)
        patch.config = JSON.stringify(input.config);
    if (input.cronExpression !== undefined)
        patch.cron_expression = input.cronExpression;
    if (input.enabled !== undefined)
        patch.enabled = input.enabled;
    patch.updated_at = new Date();
    const updated = await db
        .updateTable('integration_credentials')
        .set(patch)
        .where('id', '=', id)
        .returning(PUBLIC_COLUMNS)
        .executeTakeFirst();
    if (!updated)
        throw new NotFoundError('Integration credential not found');
    return updated;
}
export async function getCredentialWithSecret(id) {
    const credential = await db
        .selectFrom('integration_credentials')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
    if (!credential)
        throw new NotFoundError('Integration credential not found');
    const secret = decryptSecret({
        ciphertext: credential.secret_ciphertext,
        iv: credential.iv,
        authTag: credential.auth_tag,
    });
    return { credential, secret };
}
export async function testConnection(id) {
    const { credential, secret } = await getCredentialWithSecret(id);
    const adapter = integrationAdapters[credential.provider];
    const outcome = await adapter.testConnection(secret, (credential.config ?? {}));
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
//# sourceMappingURL=credentialsService.js.map