// Builder de Perfil para tests (ADR-0012 regla 3).

import type { Perfil } from '$lib/motor/schema';
import { AHORA } from './ahora';

export function perfilBase(overrides: Partial<Perfil> = {}): Perfil {
	return {
		id: 1,
		nombre: 'Persona de prueba',
		anio_nacimiento: 1995,
		peso_kg: 70,
		disclaimer_aceptado: true,
		fecha_aceptacion_disclaimer: AHORA,
		objetivo: 'hipertrofia',
		nivel_experiencia: 'principiante',
		evaluacion_por_patron: {
			PUSH: 'principiante',
			PULL: 'principiante',
			LEGS: 'principiante',
			CORE: 'principiante',
		},
		ajuste_desbalance_activo: null,
		fecha_evaluacion: AHORA,
		dias_semana: 3,
		duracion_sesion_min: 30,
		split: 'FULL_BODY',
		zonas_dolor_preexistente: [],
		tiene_anclaje: true,
		fecha_primera_sesion: null,
		...overrides,
	};
}
