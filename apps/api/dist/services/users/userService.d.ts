import type { CreateUserInput, UpdateUserInput } from '@portal/shared';
export declare function listUsers(): Promise<{
    email: string;
    role: "admin" | "zone_manager" | "floor_manager";
    id: string;
    full_name: string;
    active: boolean;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
}[]>;
export declare function getUserScopes(userId: string): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    user_id: string;
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
}[]>;
export declare function createUser(input: CreateUserInput): Promise<{
    email: string;
    role: "admin" | "zone_manager" | "floor_manager";
    id: string;
    full_name: string;
    active: boolean;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
}>;
export declare function updateUser(id: string, input: UpdateUserInput): Promise<{
    email: string;
    role: "admin" | "zone_manager" | "floor_manager";
    id: string;
    full_name: string;
    active: boolean;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
}>;
/** Bumps token_version and revokes active refresh tokens, invalidating all live sessions. */
export declare function forceLogout(userId: string): Promise<void>;
export declare function resetPassword(userId: string, newPassword: string): Promise<void>;
//# sourceMappingURL=userService.d.ts.map