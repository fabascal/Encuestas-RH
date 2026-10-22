export interface EncryptedSecret {
    ciphertext: string;
    iv: string;
    authTag: string;
    keyVersion: number;
}
/** Encrypts a plaintext secret (e.g. API key, service account JSON) at rest with AES-256-GCM. */
export declare function encryptSecret(plaintext: string): EncryptedSecret;
export declare function decryptSecret(payload: {
    ciphertext: string;
    iv: string;
    authTag: string;
}): string;
//# sourceMappingURL=encryption.d.ts.map