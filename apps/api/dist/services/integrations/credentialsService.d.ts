import type { CreateIntegrationCredentialInput } from '@portal/shared';
export declare function listCredentials(): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    config: unknown;
    company_id: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    cron_expression: string;
    enabled: boolean;
    last_tested_at: Date | null;
    last_test_success: boolean | null;
    last_test_message: string | null;
}[]>;
export declare function getCredential(id: string): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    config: unknown;
    company_id: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    cron_expression: string;
    enabled: boolean;
    last_tested_at: Date | null;
    last_test_success: boolean | null;
    last_test_message: string | null;
}>;
/** Never returns the secret ciphertext, iv, or auth tag to callers outside this module. */
export declare function createCredential(input: CreateIntegrationCredentialInput, userId: string): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    config: unknown;
    company_id: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    cron_expression: string;
    enabled: boolean;
    last_tested_at: Date | null;
    last_test_success: boolean | null;
    last_test_message: string | null;
}>;
export interface UpdateCredentialInput {
    secret?: string | undefined;
    config?: Record<string, unknown> | undefined;
    cronExpression?: string | undefined;
    enabled?: boolean | undefined;
}
export declare function updateCredential(id: string, input: UpdateCredentialInput): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    config: unknown;
    company_id: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    cron_expression: string;
    enabled: boolean;
    last_tested_at: Date | null;
    last_test_success: boolean | null;
    last_test_message: string | null;
}>;
export declare function getCredentialWithSecret(id: string): Promise<{
    credential: {
        id: string;
        created_at: {
            readonly __select__: Date;
            readonly __insert__: string | Date;
            readonly __update__: string | Date;
        };
        updated_at: {
            readonly __select__: Date;
            readonly __insert__: string | Date;
            readonly __update__: string | Date;
        };
        config: unknown;
        company_id: string | null;
        created_by: string | null;
        provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
        cron_expression: string;
        enabled: boolean;
        last_tested_at: Date | null;
        last_test_success: boolean | null;
        last_test_message: string | null;
        secret_ciphertext: string;
        iv: string;
        auth_tag: string;
        key_version: number;
    };
    secret: string;
}>;
export declare function testConnection(id: string): Promise<import("./types.js").TestConnectionOutcome>;
//# sourceMappingURL=credentialsService.d.ts.map