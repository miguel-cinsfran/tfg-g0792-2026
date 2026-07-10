import { describe, it, expect } from 'vitest';
import { aplicarSerieCompletada, pasarSiguienteEjercicio, corregirUltimaSerie } from './serie';
import { crearEstadoInicial } from './cierre';
import type { EjercicioPlanificado } from './schema';
import { AHORA } from '../../../tests/fixtures/ahora';

function plan(): EjercicioPlanificado[] {
	return [
		{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 },
		{ ejercicio_id: 'ej-b', series: 2, reps_objetivo: 8, rir_objetivo: 2, descanso_segundos: 90 },
	];
}

describe('aplicarSerieCompletada (ALG-05)', () => {
	it('la primera serie crea la entrada del ejercicio con lo planificado', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 9, 3, AHORA);
		expect(s1.ejecutados).toHaveLength(1);
		expect(s1.ejecutados[0]).toEqual({
			ejercicio_id: 'ej-a',
			series_planificadas: 3,
			series_completadas: 1,
			reps_planificadas: 10,
			reps_reales: [9],
			rir_declarado: [3],
			zonas_dolor_reportadas: [],
		});
		expect(s1.indice_serie).toBe(1);
	});

	it('las series siguientes acumulan en la misma entrada', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s2 = aplicarSerieCompletada(aplicarSerieCompletada(s0, 10, 3, AHORA), 8, 1, AHORA);
		expect(s2.ejecutados).toHaveLength(1);
		expect(s2.ejecutados[0].series_completadas).toBe(2);
		expect(s2.ejecutados[0].reps_reales).toEqual([10, 8]);
		expect(s2.ejecutados[0].rir_declarado).toEqual([3, 1]);
		expect(s2.indice_serie).toBe(2);
	});

	it('una serie sin pregunta de esfuerzo guarda null (chequeo semanal)', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s2 = aplicarSerieCompletada(aplicarSerieCompletada(s0, 10, null, AHORA), 8, 1, AHORA);
		expect(s2.ejecutados[0].rir_declarado).toEqual([null, 1]);
	});

	it('no muta la sesion recibida', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		aplicarSerieCompletada(s0, 10, 3, AHORA);
		expect(s0.ejecutados).toEqual([]);
		expect(s0.indice_serie).toBe(0);
	});

	it('sin ejercicio en curso lanza', () => {
		const s0 = { ...crearEstadoInicial(plan(), 'FULL_BODY', AHORA), indice_ejercicio: 2 };
		expect(() => aplicarSerieCompletada(s0, 10, 3, AHORA)).toThrow();
	});
});

describe('pasarSiguienteEjercicio', () => {
	it('avanza el indice y resetea la serie', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 10, 3, AHORA);
		const s2 = pasarSiguienteEjercicio(s1, AHORA);
		expect(s2.indice_ejercicio).toBe(1);
		expect(s2.indice_serie).toBe(0);
		// los acumulados del ejercicio anterior se conservan
		expect(s2.ejecutados).toHaveLength(1);
	});

	it('pasar del ultimo ejercicio deja el indice fuera del plan (sesion lista para cerrar)', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const fin = pasarSiguienteEjercicio(pasarSiguienteEjercicio(s0, AHORA), AHORA);
		expect(fin.indice_ejercicio).toBe(2);
		expect(() => pasarSiguienteEjercicio(fin, AHORA)).toThrow();
	});
});

describe('corregirUltimaSerie (F-03.2 registro por excepcion)', () => {
	it('reemplaza el ultimo reps_reales del ejercicio actual y mantiene rir_declarado', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 10, 3, AHORA);
		const s2 = corregirUltimaSerie(s1, 7, AHORA);
		expect(s2.ejecutados[0].reps_reales).toEqual([7]);
		expect(s2.ejecutados[0].rir_declarado).toEqual([3]);
	});

	it('corrige solo la ultima entrada de un ejercicio con varias series', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 10, 3, AHORA);
		const s2 = aplicarSerieCompletada(s1, 9, 1, AHORA);
		const s3 = aplicarSerieCompletada(s2, 8, 0, AHORA);
		const s4 = corregirUltimaSerie(s3, 5, AHORA);
		expect(s4.ejecutados[0].reps_reales).toEqual([10, 9, 5]);
		expect(s4.ejecutados[0].rir_declarado).toEqual([3, 1, 0]);
	});

	it('en una serie sin pregunta de esfuerzo (rir null) la correccion no toca rir_declarado', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 8, null, AHORA);
		const s2 = corregirUltimaSerie(s1, 6, AHORA);
		expect(s2.ejecutados[0].reps_reales).toEqual([6]);
		expect(s2.ejecutados[0].rir_declarado).toEqual([null]);
	});

	it('no afecta series de ejercicios anteriores', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 10, 3, AHORA);
		const s2 = aplicarSerieCompletada(s1, 9, 1, AHORA);
		const s3 = pasarSiguienteEjercicio(s2, AHORA);
		const s4 = aplicarSerieCompletada(s3, 8, 2, AHORA);
		const s5 = corregirUltimaSerie(s4, 4, AHORA);
		// ej-a queda como estaba
		expect(s5.ejecutados[0].reps_reales).toEqual([10, 9]);
		// ej-b recibe la correccion en su ultima serie
		expect(s5.ejecutados[1].reps_reales).toEqual([4]);
		expect(s5.ejecutados[1].rir_declarado).toEqual([2]);
	});

	it('no muta la sesion recibida', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = aplicarSerieCompletada(s0, 10, 3, AHORA);
		const antes = s1.ejecutados[0].reps_reales;
		corregirUltimaSerie(s1, 7, AHORA);
		expect(s1.ejecutados[0].reps_reales).toEqual(antes);
	});

	it('lanza si no hay ejercicio en curso', () => {
		const s0 = { ...crearEstadoInicial(plan(), 'FULL_BODY', AHORA), indice_ejercicio: 2 };
		expect(() => corregirUltimaSerie(s0, 5, AHORA)).toThrow();
	});

	it('lanza si el ejercicio actual no tiene series registradas', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		expect(() => corregirUltimaSerie(s0, 5, AHORA)).toThrow();
	});
});
