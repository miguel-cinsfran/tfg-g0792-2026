import { z } from 'zod';
import { PATRONES, SUBPATRONES_CORE, ZONAS, NIVELES } from '$lib/motor/schema';

export const DescripcionPropioceptivaSchema = z.object({
	posicion_inicial: z.array(z.string().min(1)).min(1),
	ejecucion: z.array(z.string().min(1)).min(1),
	referencias_propioceptivas: z.array(z.string().min(1)).min(1),
	errores_comunes: z.array(z.string().min(1)).min(1),
});

export const EjercicioSchema = z.object({
	id: z.string().min(1),
	nombre: z.string().min(1),
	patron: z.enum(PATRONES),
	subpatron: z.enum(SUBPATRONES_CORE).optional(),
	nivel_requerido: z.enum(NIVELES),
	zonas_involucradas: z.array(z.enum(ZONAS)),
	reps_iniciales: z.number(),
	// Ausente = 'repeticiones' (ver motor/schema.ts).
	medido_en: z.enum(['repeticiones', 'segundos']).optional(),
	progresion_id: z.string().nullable(),
	regresion_id: z.string().nullable(),
	// partialRecord: claves restringidas a ZONAS sin exigirlas todas,
	// espejo exacto del contrato Partial<Record<Zona, string>>.
	sustituciones: z.partialRecord(z.enum(ZONAS), z.string()),
	descripcion: DescripcionPropioceptivaSchema,
});

export const CatalogoSchema = z.object({
	_meta: z.record(z.string(), z.unknown()).optional(),
	ejercicios: z.array(EjercicioSchema),
});

export type EjercicioValidado = z.infer<typeof EjercicioSchema>;