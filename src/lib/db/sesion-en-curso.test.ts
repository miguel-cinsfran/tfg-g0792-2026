// Polyfill para IndexedDB en entorno Node (Vitest no tiene IndexedDB nativo)
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SesionEnCurso } from '$lib/motor/schema';
import { db } from './db';
import { guardarSesionEnCurso, obtenerSesionEnCurso, borrarSesionEnCurso } from './sesion-en-curso';

beforeEach(async () => {
	if (!db.isOpen()) {
		await db.open();
	}
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
});

const AHORA = new Date(2026, 5, 11, 10, 0).getTime();

function sesionEjemplo(): SesionEnCurso {
	return {
		tipo: 'FULL_BODY',
		fecha_inicio: AHORA,
		plan: [
			{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 },
		],
		indice_ejercicio: 0,
		indice_serie: 1,
		ejecutados: [
			{
				ejercicio_id: 'ej-a',
				series_planificadas: 3,
				series_completadas: 1,
				reps_planificadas: 10,
				reps_reales: [9],
				rir_declarado: [null],
				zonas_dolor_reportadas: [],
			},
		],
		cancelada_por_dolor: false,
	};
}

describe('sesion-en-curso (respaldo de reanudacion)', () => {
	it('guarda y recupera el respaldo con sus indices', async () => {
		await guardarSesionEnCurso(sesionEjemplo(), AHORA);
		const guardada = await obtenerSesionEnCurso(AHORA + 60_000);
		expect(guardada).not.toBeNull();
		expect(guardada?.sesion.indice_serie).toBe(1);
		expect(guardada?.sesion.ejecutados[0].rir_declarado).toEqual([null]);
	});

	it('sin respaldo devuelve null', async () => {
		expect(await obtenerSesionEnCurso(AHORA)).toBeNull();
	});

	it('un respaldo de mas de 12 horas se descarta y se borra', async () => {
		await guardarSesionEnCurso(sesionEjemplo(), AHORA);
		const trecehoras = AHORA + 13 * 60 * 60 * 1000;
		expect(await obtenerSesionEnCurso(trecehoras)).toBeNull();
		expect(await db.sesion_en_curso.get(1)).toBeUndefined();
	});

	it('borrar elimina el respaldo', async () => {
		await guardarSesionEnCurso(sesionEjemplo(), AHORA);
		await borrarSesionEnCurso();
		expect(await obtenerSesionEnCurso(AHORA)).toBeNull();
	});

	it('cerrarSesion (transaccion de cierre) elimina el respaldo', async () => {
		const { cerrarSesion } = await import('./sesiones');
		await guardarSesionEnCurso(sesionEjemplo(), AHORA);
		await cerrarSesion(
			{
				id: `sesion-${AHORA}`,
				fecha: AHORA,
				tipo: 'FULL_BODY',
				ejercicios: [],
				duracion_minutos: 30,
				cancelada_por_dolor: false,
			},
			[],
			AHORA,
		);
		expect(await obtenerSesionEnCurso(AHORA)).toBeNull();
	});
});
