import { z } from 'zod';
export declare const loginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export declare const authUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    fullName: z.ZodString;
    role: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    permissions: z.ZodArray<z.ZodEnum<["panel.ver", "direccion.ver", "reportes.ver", "reportes.exportar", "organizacion.gestionar", "usuarios.gestionar", "roles.gestionar", "reglas.gestionar", "captura.gestionar", "integraciones.gestionar", "origen.ver", "origen.gestionar", "periodos.cerrar", "alcance.total"]>, "many">;
}, "strip", z.ZodTypeAny, {
    email: string;
    id: string;
    fullName: string;
    role: {
        id: string;
        name: string;
    };
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
}, {
    email: string;
    id: string;
    fullName: string;
    role: {
        id: string;
        name: string;
    };
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
}>;
export type AuthUser = z.infer<typeof authUserSchema>;
export declare const loginResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    expiresInSeconds: z.ZodNumber;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        fullName: z.ZodString;
        role: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        permissions: z.ZodArray<z.ZodEnum<["panel.ver", "direccion.ver", "reportes.ver", "reportes.exportar", "organizacion.gestionar", "usuarios.gestionar", "roles.gestionar", "reglas.gestionar", "captura.gestionar", "integraciones.gestionar", "origen.ver", "origen.gestionar", "periodos.cerrar", "alcance.total"]>, "many">;
    }, "strip", z.ZodTypeAny, {
        email: string;
        id: string;
        fullName: string;
        role: {
            id: string;
            name: string;
        };
        permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    }, {
        email: string;
        id: string;
        fullName: string;
        role: {
            id: string;
            name: string;
        };
        permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    }>;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
    expiresInSeconds: number;
    user: {
        email: string;
        id: string;
        fullName: string;
        role: {
            id: string;
            name: string;
        };
        permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    };
}, {
    accessToken: string;
    expiresInSeconds: number;
    user: {
        email: string;
        id: string;
        fullName: string;
        role: {
            id: string;
            name: string;
        };
        permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    };
}>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
//# sourceMappingURL=auth.d.ts.map