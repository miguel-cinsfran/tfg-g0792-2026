// Builder de SesionCompletada para tests (ADR-0012 regla 3; el ADR lo
// llama historial-base, aqui se nombra por el tipo que construye).

import type { SesionCompletada } from '$lib/motor/schema';
import { AHORA } from './ahora';

export function sesionBase(overrides: Partial<SesionCompletada> = {}): SesionCompletada {
	return {
		id: 'sesion-test-001',
		fecha: AHORA,
		tipo: 'FULL_BODY',
		ejercicios: [],
		duracion_minutos: 30,
		cancelada_por_dolor: false,
		...overrides,
	};
}
