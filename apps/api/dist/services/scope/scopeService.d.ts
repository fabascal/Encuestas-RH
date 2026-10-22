/** Flat list of station ids a user can access, expanded from their company/zone/station scopes. */
export declare function getAccessibleStationIds(userId: string): Promise<string[]>;
export declare function userHasStationAccess(userId: string, stationId: string): Promise<boolean>;
export declare function userHasZoneAccess(userId: string, zoneId: string): Promise<boolean>;
export declare function userHasCompanyAccess(userId: string, companyId: string): Promise<boolean>;
//# sourceMappingURL=scopeService.d.ts.map