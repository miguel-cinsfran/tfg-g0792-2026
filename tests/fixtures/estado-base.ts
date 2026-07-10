// Builder de EstadoEjercicio para tests (ADR-0012 regla 3).

import type { EstadoEjercicio } from '$lib/motor/schema';

export function estadoBase(overrides: Partial<EstadoEjercicio> = {}): EstadoEjercicio {
	return {
		ejercicio_id: 'ej-test-001',
		series_objetivo: 3,
		reps_objetivo: 10,
		bloqueado: false,
		razon_bloqueo: null,
		fecha_bloqueo: null,
		fecha_revision: null,
		fecha_ultimo_uso: null,
		...overrides,
	};
}
