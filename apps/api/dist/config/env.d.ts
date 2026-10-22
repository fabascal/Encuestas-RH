import 'dotenv/config';
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    APP_ENCRYPTION_KEY: string;
    LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
};
export type BaseEnv = typeof env;
//# sourceMappingURL=env.d.ts.map