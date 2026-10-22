export declare const apiEnv: {
    PORT: number;
    JWT_ACCESS_SECRET: string;
    ACCESS_TOKEN_TTL_SECONDS: number;
    REFRESH_TOKEN_TTL_DAYS: number;
    CORS_ORIGIN: string;
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    APP_ENCRYPTION_KEY: string;
    LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
};
export type ApiEnv = typeof apiEnv;
//# sourceMappingURL=apiEnv.d.ts.map