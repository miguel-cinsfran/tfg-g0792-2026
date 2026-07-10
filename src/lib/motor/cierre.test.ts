import { describe, it, expect } from 'vitest';
import { crearEstadoInicial, cancelarSesionEnCurso, cerrarSesionEnCurso } from './cierre';
import { aplicarSerieCompletada, pasarSiguienteEjercicio } from './serie';
import type { EjercicioPlanificado } from './schema';
import { estadoBase } from '../../../tests/fixtures/estado-base';
import { AHORA, diasAntes } from '../../../tests/fixtures/ahora';

function plan(): EjercicioPlanificado[] {
	return [
		{ ejercicio_id: 'ej-a', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 },
		{ ejercicio_id: 'ej-b', series: 2, reps_objetivo: 8, rir_objetivo: 2, descanso_segundos: 90 },
	];
}

const INICIO = AHORA - 31 * 60_000; // la sesion empezo hace 31 minutos

describe('crearEstadoInicial (ADR-0007)', () => {
	it('arranca en el primer ejercicio, sin ejecutados y sin cancelar', () => {
		const s = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		expect(s).toEqual({
			tipo: 'FULL_BODY',
			fecha_inicio: AHORA,
			plan: plan(),
			indice_ejercicio: 0,
			indice_serie: 0,
			ejecutados: [],
			cancelada_por_dolor: false,
		});
	});
});

describe('cancelarSesionEnCurso', () => {
	it('marca el flag sin tocar lo acumulado', () => {
		const s0 = aplicarSerieCompletada(crearEstadoInicial(plan(), 'FULL_BODY', INICIO), 10, 3, AHORA);
		const s1 = cancelarSesionEnCurso(s0, AHORA);
		expect(s1.cancelada_por_dolor).toBe(true);
		expect(s1.ejecutados).toEqual(s0.ejecutados);
		expect(s0.cancelada_por_dolor).toBe(false);
	});
});

describe('cerrarSesionEnCurso (ALG-10)', () => {
	function sesionCompleta() {
		let s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		s = aplicarSerieCompletada(s, 10, 3, INICIO);
		s = aplicarSerieCompletada(s, 9, 1, INICIO);
		s = pasarSiguienteEjercicio(s, INICIO);
		s = aplicarSerieCompletada(s, 8, 3, INICIO);
		s = aplicarSerieCompletada(s, 7, 0, INICIO);
		s = pasarSiguienteEjercicio(s, INICIO);
		return s;
	}

	it('construye la SesionCompletada con id determinista y duracion redondeada', () => {
		const { sesion } = cerrarSesionEnCurso(sesionCompleta(), [], AHORA);
		expect(sesion.id).toBe(`sesion-${AHORA}`);
		expect(sesion.fecha).toBe(AHORA);
		expect(sesion.tipo).toBe('FULL_BODY');
		expect(sesion.duracion_minutos).toBe(31);
		expect(sesion.cancelada_por_dolor).toBe(false);
		expect(sesion.ejercicios).toHaveLength(2);
		expect(sesion.ejercicios[0].reps_reales).toEqual([10, 9]);
		expect(sesion.ejercicios[1].reps_reales).toEqual([8, 7]);
	});

	it('actualiza fecha_ultimo_uso del estado previo preservando el resto', () => {
		const previo = estadoBase({
			ejercicio_id: 'ej-a',
			reps_objetivo: 14,
			fecha_ultimo_uso: diasAntes(7),
		});
		const { estados } = cerrarSesionEnCurso(sesionCompleta(), [previo], AHORA);
		const actualizado = estados.find((e) => e.ejercicio_id === 'ej-a');
		// `reintroduccion_sesiones_restantes` se normaliza a null al
		// cerrar (ALG-10): registros previos sin reintroduccion deben
		// terminar con el campo presente en null, no undefined.
		expect(actualizado).toEqual({
			...previo,
			fecha_ultimo_uso: AHORA,
			reintroduccion_sesiones_restantes: null,
		});
	});

	it('crea estado nuevo desde lo planificado cuando no habia previo', () => {
		const { estados } = cerrarSesionEnCurso(sesionCompleta(), [], AHORA);
		expect(estados.find((e) => e.ejercicio_id === 'ej-b')).toEqual({
			ejercicio_id: 'ej-b',
			series_objetivo: 2,
			reps_objetivo: 8,
			bloqueado: false,
			razon_bloqueo: null,
			fecha_bloqueo: null,
			fecha_revision: null,
			fecha_ultimo_uso: AHORA,
		});
	});

	it('una cancelacion por dolor cierra con los datos parciales', () => {
		let s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		s = aplicarSerieCompletada(s, 10, 3, INICIO);
		s = cancelarSesionEnCurso(s, AHORA);
		const { sesion, estados } = cerrarSesionEnCurso(s, [], AHORA);
		expect(sesion.cancelada_por_dolor).toBe(true);
		expect(sesion.ejercicios).toHaveLength(1);
		// solo el ejercicio tocado actualiza estado; ej-b nunca se ejecuto
		expect(estados.map((e) => e.ejercicio_id)).toEqual(['ej-a']);
	});

	it('una sesion cancelada sin ejecutar nada cierra vacia', () => {
		const s = cancelarSesionEnCurso(crearEstadoInicial(plan(), 'FULL_BODY', AHORA), AHORA);
		const { sesion, estados } = cerrarSesionEnCurso(s, [], AHORA);
		expect(sesion.ejercicios).toEqual([]);
		expect(estados).toEqual([]);
	});
});

describe('cerrarSesionEnCurso + reintroduccion gradual (ALG-10)', () => {
	it('decrementa restantes 2 -> 1 al ejecutar el ejercicio', () => {
		const previo = estadoBase({ ejercicio_id: 'ej-a', reintroduccion_sesiones_restantes: 2 });
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const sConSerie = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(sConSerie, [previo], AHORA);
		const a = estados.find((e) => e.ejercicio_id === 'ej-a');
		expect(a?.reintroduccion_sesiones_restantes).toBe(1);
	});

	it('decrementa restantes 1 -> 0 y normaliza a null (volumen completo desde la proxima)', () => {
		const previo = estadoBase({ ejercicio_id: 'ej-a', reintroduccion_sesiones_restantes: 1 });
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const sConSerie = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(sConSerie, [previo], AHORA);
		const a = estados.find((e) => e.ejercicio_id === 'ej-a');
		// 0 se persiste como null (no como 0): la generacion distingue
		// null/undefined de 0 via `restantes > 0`, pero normalizar evita
		// arrastrar un contador que ya no aplica.
		expect(a?.reintroduccion_sesiones_restantes).toBeNull();
	});

	it('restantes = 0 no decrementa (queda 0 normalizado a null en el estado persistido)', () => {
		const previo = estadoBase({ ejercicio_id: 'ej-a', reintroduccion_sesiones_restantes: 0 });
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const sConSerie = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(sConSerie, [previo], AHORA);
		expect(estados.find((e) => e.ejercicio_id === 'ej-a')?.reintroduccion_sesiones_restantes).toBeNull();
	});

	it('restantes = null/undefined -> sigue null (sin reintroduccion activa)', () => {
		const conNull = estadoBase({ ejercicio_id: 'ej-a', reintroduccion_sesiones_restantes: null });
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const sConSerie = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(sConSerie, [conNull], AHORA);
		expect(estados.find((e) => e.ejercicio_id === 'ej-a')?.reintroduccion_sesiones_restantes).toBeNull();

		// sin el campo: registros previos a esta version del schema.
		// El ?? null los normaliza a null al persistir, asi que se
		// garantiza que el campo siempre este presente en lo que devuelve
		// el motor (los consumidores pueden confiar en el contrato).
		const sinCampo = estadoBase({ ejercicio_id: 'ej-a' });
		const sConSerie2 = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados: estados2 } = cerrarSesionEnCurso(sConSerie2, [sinCampo], AHORA);
		expect(estados2.find((e) => e.ejercicio_id === 'ej-a')?.reintroduccion_sesiones_restantes).toBeNull();
	});

	it('decremento aplica ejercicio por ejercicio, no globalmente', () => {
		// ej-a con restantes=1, ej-b sin reintroduccion. Tras el cierre:
		// ej-a normalizado a null, ej-b tambien queda null (la rama "ya
		// estaba en null/undefined" se mantiene en null).
		const previoA = estadoBase({ ejercicio_id: 'ej-a', reintroduccion_sesiones_restantes: 1 });
		const previoB = estadoBase({ ejercicio_id: 'ej-b', reintroduccion_sesiones_restantes: null });
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const s1 = aplicarSerieCompletada(s, 10, 3, INICIO);
		const s2 = pasarSiguienteEjercicio(s1, INICIO);
		const s3 = aplicarSerieCompletada(s2, 8, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(s3, [previoA, previoB], AHORA);
		expect(estados.find((e) => e.ejercicio_id === 'ej-a')?.reintroduccion_sesiones_restantes).toBeNull();
		expect(estados.find((e) => e.ejercicio_id === 'ej-b')?.reintroduccion_sesiones_restantes).toBeNull();
	});

	it('primer uso (sin estado previo) no setea reintroduccion', () => {
		const s = crearEstadoInicial(plan(), 'FULL_BODY', INICIO);
		const sConSerie = aplicarSerieCompletada(s, 10, 3, INICIO);
		const { estados } = cerrarSesionEnCurso(sConSerie, [], AHORA);
		const a = estados.find((e) => e.ejercicio_id === 'ej-a');
		// primer uso -> no aplica reintroduccion (no viene de un bloqueo)
		expect(a?.reintroduccion_sesiones_restantes).toBeUndefined();
	});
});
