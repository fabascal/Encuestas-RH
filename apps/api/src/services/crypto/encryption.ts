import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const CURRENT_KEY_VERSION = 1;

function getKey(): Buffer {
  const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key)');
  }
  return key;
}

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

/** Encrypts a plaintext secret (e.g. API key, service account JSON) at rest with AES-256-GCM. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptSecret(payload: { ciphertext: string; iv: string; authTag: string }): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
