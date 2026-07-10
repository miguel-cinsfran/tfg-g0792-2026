import { describe, it, expect } from 'vitest';
import { evaluarNivelInicial, nivelNumerico } from './evaluacion';
import { AHORA, DIA_MS } from '../../../tests/fixtures/ahora';

// Umbrales reales de rules.json (ADR-0002 regla 3: los tests usan los
// valores reales del archivo): PUSH 5/15, PULL 3/10, LEGS 15/40,
// CORE 20/60 segundos.

function entrada(parcial: Partial<Parameters<typeof evaluarNivelInicial>[0]> = {}) {
	return {
		reps_push: 0,
		reps_pull: 0,
		reps_legs: 0,
		segundos_core: 0,
		tiene_anclaje: true,
		...parcial,
	};
}

describe('nivelNumerico', () => {
	it('mapea principiante 1, intermedio 2, avanzado 3', () => {
		expect(nivelNumerico('principiante')).toBe(1);
		expect(nivelNumerico('intermedio')).toBe(2);
		expect(nivelNumerico('avanzado')).toBe(3);
	});
});

describe('evaluarNivelInicial (ALG-01)', () => {
	it('todo en cero da principiante global sin desbalance', () => {
		const r = evaluarNivelInicial(entrada(), AHORA);
		expect(r.nivel_global).toBe('principiante');
		expect(r.evaluacion_por_patron).toEqual({
			PUSH: 'principiante',
			PULL: 'principiante',
			LEGS: 'principiante',
			CORE: 'principiante',
		});
		expect(r.ajuste_desbalance_activo).toBeNull();
	});

	it('clasifica en los limites exactos de los umbrales (PUSH 5/15)', () => {
		expect(evaluarNivelInicial(entrada({ reps_push: 5 }), AHORA).evaluacion_por_patron.PUSH).toBe(
			'principiante',
		);
		expect(evaluarNivelInicial(entrada({ reps_push: 6 }), AHORA).evaluacion_por_patron.PUSH).toBe(
			'intermedio',
		);
		expect(evaluarNivelInicial(entrada({ reps_push: 15 }), AHORA).evaluacion_por_patron.PUSH).toBe(
			'intermedio',
		);
		expect(evaluarNivelInicial(entrada({ reps_push: 16 }), AHORA).evaluacion_por_patron.PUSH).toBe(
			'avanzado',
		);
	});

	it('avanzado parejo da avanzado global', () => {
		const r = evaluarNivelInicial(
			entrada({ reps_push: 20, reps_pull: 12, reps_legs: 50, segundos_core: 90 }),
			AHORA,
		);
		expect(r.nivel_global).toBe('avanzado');
		expect(r.ajuste_desbalance_activo).toBeNull();
	});

	it('empate 2 a 2 en la moda gana el mas conservador', () => {
		// PUSH y PULL avanzado; LEGS y CORE intermedio -> global intermedio.
		const r = evaluarNivelInicial(
			entrada({ reps_push: 20, reps_pull: 12, reps_legs: 20, segundos_core: 30 }),
			AHORA,
		);
		expect(r.nivel_global).toBe('intermedio');
	});

	it('sin anclaje, PULL queda principiante aunque haya reps declaradas', () => {
		const r = evaluarNivelInicial(
			entrada({ reps_pull: 12, reps_push: 8, reps_legs: 20, segundos_core: 30, tiene_anclaje: false }),
			AHORA,
		);
		expect(r.evaluacion_por_patron.PULL).toBe('principiante');
		// global intermedio (PUSH/LEGS/CORE intermedio) -> PULL es el debil.
		expect(r.nivel_global).toBe('intermedio');
		expect(r.ajuste_desbalance_activo?.patron).toBe('PULL');
	});

	it('el patron mas debil es el de mayor diferencia con el global', () => {
		// PUSH/PULL/LEGS avanzado, CORE principiante -> global avanzado,
		// CORE dif 2 es el mas debil.
		const r = evaluarNivelInicial(
			entrada({ reps_push: 20, reps_pull: 12, reps_legs: 50, segundos_core: 10 }),
			AHORA,
		);
		expect(r.nivel_global).toBe('avanzado');
		expect(r.ajuste_desbalance_activo?.patron).toBe('CORE');
	});

	it('dos patrones debiles con distinta diferencia: gana el mas alejado', () => {
		// Global avanzado (PUSH y PULL avanzado, count 2 sin empate),
		// LEGS intermedio (dif 1) y CORE principiante (dif 2) -> CORE.
		// Nota: el empate exacto de diferencias es inalcanzable con 4
		// patrones y moda conservadora (dos debiles al mismo nivel
		// empatan la moda y bajan el global); la prioridad PULL > PUSH >
		// LEGS > CORE del codigo queda como rama defensiva fiel a la spec.
		const r = evaluarNivelInicial(
			entrada({ reps_push: 20, reps_pull: 12, reps_legs: 20, segundos_core: 10 }),
			AHORA,
		);
		expect(r.nivel_global).toBe('avanzado');
		expect(r.ajuste_desbalance_activo?.patron).toBe('CORE');
	});

	it('el ajuste lleva las fechas y el porcentaje de rules.json', () => {
		const r = evaluarNivelInicial(
			entrada({ reps_push: 8, reps_legs: 20, segundos_core: 30, reps_pull: 2 }),
			AHORA,
		);
		const ajuste = r.ajuste_desbalance_activo;
		expect(ajuste).not.toBeNull();
		expect(ajuste?.porcentaje).toBe(15);
		expect(ajuste?.fecha_inicio).toBe(AHORA);
		expect(ajuste?.fecha_revision).toBe(AHORA + 4 * 7 * DIA_MS);
	});
});
