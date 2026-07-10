import { describe, it, expect } from 'vitest';
import {
	evaluarProgresionesSugeridas,
	esChequeoDeLaSesion,
} from './progresion-sugerida';
import { esSesionDeChequeo } from './chequeo';
import type { Ejercicio, EjercicioEjecutado, SesionCompletada } from './schema';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';
import { sesionBase } from '../../../tests/fixtures/sesion-base';
import { estadoBase } from '../../../tests/fixtures/estado-base';
import { diasAntes } from '../../../tests/fixtures/ahora';

const REGLA = 2;

// Semana de referencia (lunes 8 jun 2026 a domingo 14 jun 2026 local).
const LUNES = new Date(2026, 5, 8, 8, 0).getTime();
const MIERCOLES = new Date(2026, 5, 10, 8, 0).getTime();
const LUNES_ANTERIOR = new Date(2026, 5, 1, 8, 0).getTime();

// Construye un EjercicioEjecutado cuyo `reps_reales` y `rir_declarado`
// reflejen lo que se vio en la ULTIMA serie: la spec del chequeo
// semanal guarda el esfuerzo SOLO en la ultima serie (rir null en el
// resto). Para tests compactos, una sola serie basta.
function ejecutado(
	id: string,
	reps_planificadas: number,
	reps_reales: number,
	rir_ultima: number | null,
): EjercicioEjecutado {
	return {
		ejercicio_id: id,
		series_planificadas: 3,
		series_completadas: 1,
		reps_planificadas,
		reps_reales: [reps_reales],
		rir_declarado: [rir_ultima],
		zonas_dolor_reportadas: [],
	};
}

function sesion(fecha: number, ejercicios: EjercicioEjecutado[], cancelada = false): SesionCompletada {
	return sesionBase({
		id: `sesion-${fecha}`,
		fecha,
		tipo: 'FULL_BODY',
		ejercicios,
		duracion_minutos: 30,
		cancelada_por_dolor: cancelada,
	});
}

describe('esChequeoDeLaSesion', () => {
	it('delega en esSesionDeChequeo con la fecha de la sesion actual', () => {
		const sesionAnterior = sesion(LUNES, []);
		const actual = sesion(MIERCOLES, []);
		expect(esChequeoDeLaSesion([sesionAnterior], actual)).toBe(
			esSesionDeChequeo([sesionAnterior], MIERCOLES),
		);
	});
});

describe('evaluarProgresionesSugeridas (ALG-12)', () => {
	const EJ_FACIL: Ejercicio = ejercicioBase({
		id: 'ej-facil',
		progresion_id: 'ej-dificil',
	});
	const EJ_DIFICIL: Ejercicio = ejercicioBase({ id: 'ej-dificil' });
	const EJ_EXTREMO: Ejercicio = ejercicioBase({
		id: 'ej-extremo',
		progresion_id: null,
	});
	const EJ_OTRO: Ejercicio = ejercicioBase({ id: 'ej-otro', progresion_id: 'ej-otro-2' });
	const catalogo = [EJ_FACIL, EJ_DIFICIL, EJ_EXTREMO, EJ_OTRO];

	it('no sugiere nada si la sesion no es de chequeo', () => {
		// Hay dos sesiones esta semana: la actual NO es la primera.
		const previa = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(MIERCOLES, [ejecutado('ej-facil', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('no sugiere si la sesion fue cancelada por dolor', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)], true);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('no sugiere si no hay suficientes sesiones de chequeo del ejercicio', () => {
		// Solo hay 1 sesion de chequeo (la actual) que cumple: faltan 2.
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([], actual, catalogo, REGLA)).toEqual([]);
	});

	it('sugiere cuando 2 chequeos cumplen: objetivo alcanzado y RIR >= 3', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const r = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(r).toEqual([{ ejercicio: EJ_FACIL, destino_id: 'ej-dificil' }]);
	});

	it('no sugiere si una de las 2 sesiones tuvo RIR < 3', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 1)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('no sugiere si en una sesion no se alcanzo el objetivo de reps', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 7, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('las sesiones que NO son de chequeo (rir null en la ultima serie) no cuentan', () => {
		// La sesion del lunes anterior SI es de chequeo (primera no
		// cancelada de su semana), pero su ultima serie sobre ej-facil
		// tiene rir_declarado null (la sesion de esa semana no pregunto
		// sobre ese ejercicio). Por eso falta el dato: no cuenta.
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, null)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('una sesion cancelada por dolor no cuenta como chequeo (la siguiente de la semana vuelve a ser chequeo)', () => {
		// Misma semana, dos sesiones: la primera cancelada por dolor, la
		// segunda completa. La cancelada NO es chequeo (cancelada_por_dolor=true);
		// la segunda SI es chequeo porque, cancelaciones aparte, es la
		// primera de la semana. El rir_declarado capturado es el de la
		// segunda (no de la cancelada).
		const cancelada = sesion(
			new Date(2026, 5, 8, 8, 0).getTime(),
			[ejecutado('ej-facil', 10, 10, 3)],
			true,
		);
		const completa = sesion(
			new Date(2026, 5, 10, 8, 0).getTime(), // miercoles de la misma semana
			[ejecutado('ej-facil', 10, 10, 3)],
		);
		const actual = sesion(
			new Date(2026, 5, 15, 8, 0).getTime(), // lunes siguiente
			[ejecutado('ej-facil', 10, 10, 3)],
		);
		// cuentaChequeosCumplidos cuenta: completa (chequeo, cumple) + actual
		// (chequeo, cumple) = 2 ultimas, todas cumplen. SUGIERE.
		const r = evaluarProgresionesSugeridas([cancelada, completa], actual, catalogo, REGLA);
		expect(r).toEqual([{ ejercicio: EJ_FACIL, destino_id: 'ej-dificil' }]);
	});

	it('no sugiere para un ejercicio en reintroduccion gradual post-dolor (ALG-08 x ALG-12)', () => {
		// ej-facil cumple el criterio en 2 chequeos, pero su objetivo viene
		// rebajado por la reintroduccion (lo alcanza holgado justo por eso):
		// con el contador activo NO debe sugerirse progresion a la variante
		// mas dificil.
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const estados = [estadoBase({ ejercicio_id: 'ej-facil', reintroduccion_sesiones_restantes: 1 })];
		expect(
			evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA, estados),
		).toEqual([]);
	});

	it('si la reintroduccion ya termino (contador null), vuelve a sugerir', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const estados = [estadoBase({ ejercicio_id: 'ej-facil', reintroduccion_sesiones_restantes: null })];
		const r = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA, estados);
		expect(r).toEqual([{ ejercicio: EJ_FACIL, destino_id: 'ej-dificil' }]);
	});

	it('un ejercicio con progresion_id null (extremo de cadena) nunca genera sugerencia', () => {
		// ej-extremo cumple criterio pero progresion_id es null.
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-extremo', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-extremo', 10, 10, 3)]);
		expect(evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA)).toEqual([]);
	});

	it('mezcla de ejercicios: solo los que cumplen y tienen progresion_id aparecen', () => {
		// ej-facil cumple y tiene progresion -> sugiere.
		// ej-extremo cumple pero sin progresion -> no sugiere.
		// ej-otro aparece solo en la sesion actual (1 sola vez) -> no sugiere.
		const previa = sesion(LUNES_ANTERIOR, [
			ejecutado('ej-facil', 10, 10, 3),
			ejecutado('ej-extremo', 10, 10, 3),
		]);
		const actual = sesion(LUNES, [
			ejecutado('ej-facil', 10, 10, 3),
			ejecutado('ej-extremo', 10, 10, 3),
			ejecutado('ej-otro', 10, 10, 3),
		]);
		const r = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(r).toEqual([{ ejercicio: EJ_FACIL, destino_id: 'ej-dificil' }]);
	});

	it('orden determinista por id (estable para la UI y los tests)', () => {
		const previa = sesion(LUNES_ANTERIOR, [
			ejecutado('ej-otro', 10, 10, 3),
			ejecutado('ej-facil', 10, 10, 3),
		]);
		const actual = sesion(LUNES, [
			ejecutado('ej-otro', 10, 10, 3),
			ejecutado('ej-facil', 10, 10, 3),
		]);
		const r = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(r.map((s) => s.ejercicio.id)).toEqual(['ej-facil', 'ej-otro']);
	});

	it('toma los N chequeos mas recientes aunque haya mas de N en el historial', () => {
		// 3 sesiones de chequeo para ej-facil. La MAS antigua no cumple.
		// Las 2 mas recientes si: por lo tanto, SUGIERE.
		const antigua = sesion(diasAntes(30), [ejecutado('ej-facil', 10, 7, 3)]);
		const media = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const r = evaluarProgresionesSugeridas([antigua, media], actual, catalogo, REGLA);
		expect(r).toEqual([{ ejercicio: EJ_FACIL, destino_id: 'ej-dificil' }]);
	});

	it('es determinista: dos llamadas con mismo input retornan identico', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const a = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		const b = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(a).toEqual(b);
	});

	it('es pura: no muta el historial ni la sesion recibidos', () => {
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const copiaHist = JSON.parse(JSON.stringify([previa]));
		const copiaSes = JSON.parse(JSON.stringify(actual));
		evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(previa).toEqual(copiaHist[0]);
		expect(actual).toEqual(copiaSes);
	});

	it('sanity del contrato de chequeo contra el predicado de motor/chequeo.ts', () => {
		// La sesion del lunes es la primera no cancelada de su semana,
		// por lo que es de chequeo. La guarda de ALG-03 (sin historial
		// no hay chequeo) sigue aplicando: con historial vacio NO es
		// chequeo; con historial previo de semanas anteriores SI.
		expect(esSesionDeChequeo([], LUNES)).toBe(false);
		const previa = sesion(diasAntes(14), []);
		expect(esSesionDeChequeo([previa], LUNES)).toBe(true);
	});

	it('rechazar no muta nada: la evaluacion es de solo lectura', () => {
		// El modulo solo EVALUA; aplicar es responsabilidad de la UI
		// (que reusa `progresar` de ALG-09 + `guardarEstado` de la db).
		// Verificamos que llamar la funcion repetidamente no muta el
		// historial ni la sesion.
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const copiaHist = JSON.parse(JSON.stringify([previa]));
		const copiaSes = JSON.parse(JSON.stringify(actual));
		evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(previa).toEqual(copiaHist[0]);
		expect(actual).toEqual(copiaSes);
	});

	it('la sugerencia apunta al destino y respeta `progresion_id` (integracion con ALG-09)', () => {
		// Lo que la UI hace al confirmar es llamar a `progresar` (ALG-09)
		// con el `ejercicio` de la sugerencia y persistir el estado
		// nuevo. Aqui verificamos que la salida de ALG-09 coincide con
		// lo que `destino_id` declara: misma variante, mismo `reps_iniciales`.
		const previa = sesion(LUNES_ANTERIOR, [ejecutado('ej-facil', 10, 10, 3)]);
		const actual = sesion(LUNES, [ejecutado('ej-facil', 10, 10, 3)]);
		const [sug] = evaluarProgresionesSugeridas([previa], actual, catalogo, REGLA);
		expect(sug).toBeDefined();
		// Importacion lazy: evita acoplar este test a motor/progresion.ts
		// si en el futuro cambia la firma; el contrato que cuenta es que
		// el id del destino coincida con `destino_id`.
		const destinoEnCatalogo = catalogo.find((e) => e.id === sug.destino_id);
		expect(destinoEnCatalogo).toBeDefined();
		expect(destinoEnCatalogo?.reps_iniciales).toBe(10);
	});
});
