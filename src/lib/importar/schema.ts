// Schema Zod del JSON de exportacion/importacion. Se exportan SOLO
// los cuatro almacenes. El catalogo NO viaja: vive en static/data.

import { z } from 'zod';
import { OBJETIVOS, NIVELES, SPLITS, ZONAS, TIPOS_SESION } from '$lib/motor/schema';

export const VERSION_EXPORTE = 1;

const PATRONES_EVALUABLES = ['PUSH', 'PULL', 'LEGS', 'CORE'] as const;

const AjusteDesbalanceSchema = z.object({
	patron: z.enum(PATRONES_EVALUABLES),
	porcentaje: z.number(),
	fecha_inicio: z.number(),
	fecha_revision: z.number(),
});

const PerfilSchema = z.object({
	id: z.literal(1),
	nombre: z.string().min(1),
	anio_nacimiento: z.number(),
	peso_kg: z.number(),
	altura_cm: z.number().optional(),
	disclaimer_aceptado: z.boolean(),
	fecha_aceptacion_disclaimer: z.number(),
	objetivo: z.enum(OBJETIVOS),
	nivel_experiencia: z.enum(NIVELES),
	evaluacion_por_patron: z.record(z.enum(PATRONES_EVALUABLES), z.enum(NIVELES)),
	ajuste_desbalance_activo: AjusteDesbalanceSchema.nullable(),
	fecha_evaluacion: z.number(),
	dias_semana: z.number().min(1).max(5),
	duracion_sesion_min: z.number(),
	split: z.enum(SPLITS),
	zonas_dolor_preexistente: z.array(z.enum(ZONAS)),
	tiene_anclaje: z.boolean(),
	fecha_primera_sesion: z.number().nullable(),
});

const EstadoEjercicioSchema = z.object({
	ejercicio_id: z.string().min(1),
	series_objetivo: z.number(),
	reps_objetivo: z.number(),
	bloqueado: z.boolean(),
	razon_bloqueo: z.string().nullable(),
	fecha_bloqueo: z.number().nullable(),
	fecha_revision: z.number().nullable(),
	fecha_ultimo_uso: z.number().nullable(),
});

const EjercicioEjecutadoSchema = z.object({
	ejercicio_id: z.string().min(1),
	series_planificadas: z.number(),
	series_completadas: z.number(),
	reps_planificadas: z.number(),
	reps_reales: z.array(z.number()),
	// null = serie sin pregunta de esfuerzo (chequeo semanal, motor/chequeo.ts)
	rir_declarado: z.array(z.number().nullable()),
	zonas_dolor_reportadas: z.array(z.enum(ZONAS)),
});

const SesionCompletadaSchema = z.object({
	id: z.string().min(1),
	fecha: z.number(),
	tipo: z.enum(TIPOS_SESION),
	ejercicios: z.array(EjercicioEjecutadoSchema),
	duracion_minutos: z.number(),
	cancelada_por_dolor: z.boolean(),
});

const RegistroDolorSchema = z.object({
	id: z.string().min(1),
	ejercicio_id: z.string().min(1),
	zonas: z.array(z.enum(ZONAS)),
	fecha: z.number(),
	estado: z.enum(['bloqueado', 'resuelto']),
});

export const ExporteSchema = z.object({
	version: z.literal(VERSION_EXPORTE),
	perfil: PerfilSchema.nullable(),
	estado_ejercicios: z.array(EstadoEjercicioSchema),
	sesiones: z.array(SesionCompletadaSchema),
	historial_dolor: z.array(RegistroDolorSchema),
});

export type Exporte = z.infer<typeof ExporteSchema>;
