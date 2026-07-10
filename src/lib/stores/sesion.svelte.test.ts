// Tests del store de sesion en curso (ADR-0007).
// ADR-0001: nunca Date.now() en tests; usar timestamp literal AHORA.
// ADR-0012: vecino al codigo, fake-indexeddb para integracion con Dexie.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '$lib/db/db';
import {
	obtenerSesion,
	comenzar,
	completarSerie,
	corregirUltimaSerie,
	siguienteEjercicio,
	cancelar,
	descartar,
	registrarDolor,
	sustituir,
	cerrar,
} from './sesion.svelte';
import type { EjercicioPlanificado, TipoSesion } from '$lib/motor/schema';
import { AHORA } from '../../../tests/fixtures/ahora';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';

// Plan de fixture: 3 ejercicios x 2 series x 8 reps cada uno.
function plan3Ejercicios(): EjercicioPlanificado[] {
	return [
		{
			ejercicio_id: 'ej-a',
			series: 2,
			reps_objetivo: 8,
			rir_objetivo: 2,
			descanso_segundos: 90,
		},
		{
			ejercicio_id: 'ej-b',
			series: 2,
			reps_objetivo: 8,
			rir_objetivo: 2,
			descanso_segundos: 90,
		},
		{
			ejercicio_id: 'ej-c',
			series: 2,
			reps_objetivo: 8,
			rir_objetivo: 2,
			descanso_segundos: 90,
		},
	];
}

beforeEach(async () => {
	if (!db.isOpen()) {
		await db.open();
	}
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
	// Limpiar el store entre tests para evitar fuga de estado.
	descartar();
});

describe('sesion store — obtenerSesion y comenzar', () => {
	it('obtenerSesion retorna null inicialmente', () => {
		expect(obtenerSesion()).toBeNull();
	});

	it('comenzar puebla obtenerSesion con estado inicial', () => {
		const plan = plan3Ejercicios();
		comenzar(plan, 'FULL_BODY' as TipoSesion, AHORA);
		const sesion = obtenerSesion();
		expect(sesion).not.toBeNull();
		expect(sesion!.tipo).toBe('FULL_BODY');
		expect(sesion!.plan).toEqual(plan);
		expect(sesion!.indice_ejercicio).toBe(0);
		expect(sesion!.indice_serie).toBe(0);
		expect(sesion!.ejecutados).toEqual([]);
		expect(sesion!.cancelada_por_dolor).toBe(false);
	});
});

describe('sesion store — transiciones sin sesion lanzan Error', () => {
	it('completarSerie sin sesion lanza "No hay sesion activa"', () => {
		expect(() => completarSerie(8, 2, AHORA)).toThrow('No hay sesión activa');
	});

	it('siguienteEjercicio sin sesion lanza', () => {
		expect(() => siguienteEjercicio(AHORA)).toThrow('No hay sesión activa');
	});

	it('cancelar sin sesion lanza', () => {
		expect(() => cancelar(AHORA)).toThrow('No hay sesión activa');
	});

	it('registrarDolor sin sesion lanza', () => {
		expect(() => registrarDolor(['hombros'], AHORA)).toThrow('No hay sesión activa');
	});

	it('sustituir sin sesion lanza', () => {
		expect(() => sustituir(ejercicioBase({ id: 'ej-alt' }), [], AHORA)).toThrow('No hay sesión activa');
	});

	it('sustituir reemplaza el slot actual y reinicia la serie', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		completarSerie(8, 2, AHORA);
		sustituir(ejercicioBase({ id: 'ej-alt', reps_iniciales: 5 }), [], AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.plan[0].ejercicio_id).toBe('ej-alt');
		// Sin EstadoEjercicio del sustituto, arranca con sus reps_iniciales.
		expect(sesion.plan[0].reps_objetivo).toBe(5);
		expect(sesion.indice_serie).toBe(0);
	});

	it('cerrar sin sesion lanza', async () => {
		await expect(cerrar(AHORA)).rejects.toThrow('No hay sesión activa');
	});
});

describe('sesion store — completarSerie y siguienteEjercicio', () => {
	it('completarSerie avanza indice_serie y acumula ejecutados', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		completarSerie(8, 2, AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.indice_serie).toBe(1);
		expect(sesion.ejecutados).toHaveLength(1);
		expect(sesion.ejecutados[0].series_completadas).toBe(1);
		expect(sesion.ejecutados[0].reps_reales).toEqual([8]);
	});

	it('siguienteEjercicio avanza indice_ejercicio y resetea indice_serie', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		completarSerie(8, 2, AHORA);
		completarSerie(8, 2, AHORA);
		// Terminadas 2 series del primer ejercicio.
		siguienteEjercicio(AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.indice_ejercicio).toBe(1);
		expect(sesion.indice_serie).toBe(0);
	});
});

describe('sesion store — cancelar y descartar', () => {
	it('cancelar marca cancelada_por_dolor en true', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		cancelar(AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.cancelada_por_dolor).toBe(true);
	});

	it('descartar nullifica obtenerSesion', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		descartar();
		expect(obtenerSesion()).toBeNull();
	});
});

describe('sesion store — cerrar con Dexie', () => {
	it('cerrar persiste en Dexie y nullifica estado', async () => {
		const plan = plan3Ejercicios();
		comenzar(plan, 'FULL_BODY' as TipoSesion, AHORA);
		// Completar 1 serie del primer ejercicio.
		completarSerie(8, 2, AHORA);

		const resultado = await cerrar(AHORA + 31 * 60_000);
		expect(resultado.tipo).toBe('FULL_BODY');
		expect(resultado.ejercicios).toHaveLength(1);
		expect(obtenerSesion()).toBeNull();

		// Verificar que la sesion se persistio en Dexie.
		const sesiones = await db.sesiones.toArray();
		expect(sesiones).toHaveLength(1);
		expect(sesiones[0].id).toBe(resultado.id);
	});
});

// F-03.2 registro por excepcion: en el caso comun (fuera de la sesion de
// chequeo, o series previas a la ultima de cada ejercicio dentro de ella)
// la serie se cierra con reps_reales = reps_objetivo y rir_declarado = null
// sin pedir confirmacion. La accion "Registrar otra cantidad" en el
// descanso permite corregir el valor recien registrado.
describe('sesion store — registro por excepcion (F-03.2)', () => {
	it('caso comun: serie completada registra reps=objetivo y rir=null', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		completarSerie(8, null, AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.ejecutados[0].reps_reales).toEqual([8]);
		expect(sesion.ejecutados[0].rir_declarado).toEqual([null]);
		expect(sesion.ejecutados[0].series_completadas).toBe(1);
		expect(sesion.indice_serie).toBe(1);
	});

	it('caso comun isometrico: la cantidad registrada son los segundos del cronometro', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		// Cronometro parado a 42 s: la serie queda con 42 (no reps_objetivo).
		completarSerie(42, null, AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.ejecutados[0].reps_reales).toEqual([42]);
		expect(sesion.ejecutados[0].rir_declarado).toEqual([null]);
	});

	it('"Registrar otra cantidad" corrige la ultima serie sin afectar a las demas', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		// Tres series comunes (caso por excepcion).
		completarSerie(8, null, AHORA);
		completarSerie(8, null, AHORA);
		completarSerie(8, null, AHORA);
		// El usuario hizo 6 en la ultima; corrige desde el descanso.
		corregirUltimaSerie(6, AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.ejecutados[0].reps_reales).toEqual([8, 8, 6]);
		expect(sesion.ejecutados[0].rir_declarado).toEqual([null, null, null]);
		// El indice de serie NO se mueve: la correccion es in-place.
		expect(sesion.indice_serie).toBe(3);
	});

	it('la correccion de una serie no se propaga a ejercicios siguientes', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		completarSerie(8, null, AHORA);
		completarSerie(8, null, AHORA);
		siguienteEjercicio(AHORA);
		completarSerie(8, null, AHORA);
		corregirUltimaSerie(5, AHORA);
		const sesion = obtenerSesion()!;
		expect(sesion.ejecutados[0].reps_reales).toEqual([8, 8]);
		expect(sesion.ejecutados[1].reps_reales).toEqual([5]);
	});

	it('caso chequeo: la serie de esfuerzo guarda el rir y reps_reales (no null)', () => {
		comenzar(plan3Ejercicios(), 'FULL_BODY' as TipoSesion, AHORA);
		// En sesion de chequeo la ultima serie del ejercicio guarda esfuerzo.
		completarSerie(8, null, AHORA); // primera serie: sin pregunta
		completarSerie(7, 3, AHORA);    // ultima: con pregunta de esfuerzo
		const sesion = obtenerSesion()!;
		expect(sesion.ejecutados[0].reps_reales).toEqual([8, 7]);
		expect(sesion.ejecutados[0].rir_declarado).toEqual([null, 3]);
	});

	it('corregirUltimaSerie sin sesion lanza "No hay sesion activa"', () => {
		expect(() => corregirUltimaSerie(5, AHORA)).toThrow('No hay sesión activa');
	});
});