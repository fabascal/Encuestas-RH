export interface AuthenticatedUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'zone_manager' | 'floor_manager';
    token_version: number;
}
export declare function verifyCredentials(email: string, password: string): Promise<AuthenticatedUser>;
export declare function issueRefreshToken(userId: string): Promise<{
    token: string;
    expiresAt: Date;
}>;
export declare function rotateRefreshToken(rawToken: string): Promise<{
    user: AuthenticatedUser;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
}>;
export declare function revokeRefreshToken(rawToken: string): Promise<void>;
//# sourceMappingURL=authService.d.ts.map