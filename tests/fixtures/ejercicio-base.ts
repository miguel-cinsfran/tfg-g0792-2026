// Builder de Ejercicio para tests del motor (ADR-0012 regla 3).
// Devuelve un ejercicio valido y completo; cada test ajusta solo lo
// que le importa via overrides.

import type { Ejercicio } from '$lib/motor/schema';

export function ejercicioBase(overrides: Partial<Ejercicio> = {}): Ejercicio {
	return {
		id: 'ej-test-001',
		nombre: 'Ejercicio de prueba',
		patron: 'PUSH_H',
		nivel_requerido: 'principiante',
		zonas_involucradas: ['hombros', 'codos'],
		reps_iniciales: 10,
		progresion_id: null,
		regresion_id: null,
		sustituciones: {},
		descripcion: {
			posicion_inicial: ['Posicion inicial de prueba.'],
			ejecucion: ['Ejecucion de prueba.'],
			referencias_propioceptivas: ['Referencias de prueba.'],
			errores_comunes: ['Errores de prueba.'],
		},
		...overrides,
	};
}
