// Builder de EstadoOnboarding para tests (ADR-0012 regla 3).

import type { EstadoOnboarding } from '$lib/onboarding/estado';
import { AHORA } from './ahora';

export function estadoOnboardingCompleto(overrides: Partial<EstadoOnboarding> = {}): EstadoOnboarding {
	return {
		disclaimer_aceptado: true,
		fecha_aceptacion_disclaimer: AHORA,
		nombre: 'Persona de prueba',
		anio_nacimiento: 1995,
		peso_kg: 70,
		altura_cm: 170,
		objetivo: 'hipertrofia',
		tiene_anclaje: true,
		zonas_dolor_preexistente: [],
		dias_semana: 3,
		duracion_sesion_min: 30,
		reps_push: 15,
		reps_pull: 10,
		reps_legs: 20,
		segundos_core: 45,
		...overrides,
	};
}
