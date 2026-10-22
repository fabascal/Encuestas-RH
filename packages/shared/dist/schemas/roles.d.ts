import { z } from 'zod';
export declare const createRoleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    permissions: z.ZodArray<z.ZodEnum<["panel.ver", "direccion.ver", "reportes.ver", "reportes.exportar", "organizacion.gestionar", "usuarios.gestionar", "roles.gestionar", "reglas.gestionar", "captura.gestionar", "integraciones.gestionar", "origen.ver", "origen.gestionar", "periodos.cerrar", "alcance.total"]>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    description: string | null;
}, {
    name: string;
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    description: string | null;
}>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export declare const updateRoleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    permissions: z.ZodArray<z.ZodEnum<["panel.ver", "direccion.ver", "reportes.ver", "reportes.exportar", "organizacion.gestionar", "usuarios.gestionar", "roles.gestionar", "reglas.gestionar", "captura.gestionar", "integraciones.gestionar", "origen.ver", "origen.gestionar", "periodos.cerrar", "alcance.total"]>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    description: string | null;
}, {
    name: string;
    permissions: ("panel.ver" | "direccion.ver" | "reportes.ver" | "reportes.exportar" | "organizacion.gestionar" | "usuarios.gestionar" | "roles.gestionar" | "reglas.gestionar" | "captura.gestionar" | "integraciones.gestionar" | "origen.ver" | "origen.gestionar" | "periodos.cerrar" | "alcance.total")[];
    description: string | null;
}>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
//# sourceMappingURL=roles.d.ts.map