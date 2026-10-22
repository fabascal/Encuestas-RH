import type { CreateCompanyInput, CreateStationInput, CreateZoneInput } from '@portal/shared';
import type { AuthUser } from '../../middlewares/authenticate.js';
export declare function listCompanies(): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    name: string;
}[]>;
export declare function listCompaniesForUser(user: AuthUser): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    name: string;
}[]>;
export declare function createCompany(input: CreateCompanyInput): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    name: string;
}>;
export declare function setCompanyActive(id: string, active: boolean): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    name: string;
}>;
export declare function listZones(companyId?: string): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    company_id: string;
    name: string;
}[]>;
export declare function listZonesForUser(user: AuthUser, companyId?: string): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    company_id: string;
    name: string;
}[]>;
export declare function createZone(input: CreateZoneInput): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    company_id: string;
    name: string;
}>;
export declare function setZoneActive(id: string, active: boolean): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    company_id: string;
    name: string;
}>;
export declare function listStations(zoneId?: string): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    zone_id: string;
    name: string;
    address: string | null;
}[]>;
export declare function listStationsForUser(user: AuthUser, zoneId?: string): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    zone_id: string;
    name: string;
    address: string | null;
}[]>;
export declare function createStation(input: CreateStationInput): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    zone_id: string;
    name: string;
    address: string | null;
}>;
export declare function getStation(id: string): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    zone_id: string;
    name: string;
    address: string | null;
}>;
export declare function setStationActive(id: string, active: boolean): Promise<{
    code: string;
    id: string;
    active: boolean;
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
    zone_id: string;
    name: string;
    address: string | null;
}>;
//# sourceMappingURL=orgService.d.ts.map