// Progresion SUGERIDA (no automatica) en la sesion de chequeo. Modulo
// puro: recibe historial + catalogo + sesion y devuelve la lista de
// ejercicios listos para sugerir. NO aplica el cambio: la UI reusa
// `progresar` + `guardarEstado` al confirmar.
//
// Criterio "listo para subir": en las N (= `regla`) sesiones de chequeo
// mas recientes de ese ejercicio, el usuario alcanzo `reps_planificadas`
// con rir >= 3. "Sesion de chequeo" = primera no cancelada de su semana
// (mismo criterio que motor/chequeo.ts).
//
// Solo se sugieren ejercicios con `progresion_id != null` y que NO estan
// en reintroduccion post-dolor (a volumen reducido alcanzan el objetivo
// rebajado con facilidad y no deberian sugerir subir).

import type { Ejercicio, EstadoEjercicio, SesionCompletada } from './schema.js';
import { esSesionDeChequeo } from './chequeo.js';
import { inicioSemana } from './racha.js';

export interface SugerenciaProgresion {
	ejercicio: Ejercicio;
	// Copia de ejercicio.progresion_id, para que la UI no confie en la
	// inmutabilidad del catalogo.
	destino_id: string;
}

export function esChequeoDeLaSesion(
	historial: SesionCompletada[],
	sesionActual: SesionCompletada,
): boolean {
	// El historial llega ANTES de appendear `sesionActual`, asi la
	// pregunta se responde sobre el historial previo. Coincide con la
	// lectura que hara la UI al cerrar() y evaluar sugerencias.
	return esSesionDeChequeo(historial, sesionActual.fecha);
}

function ultimaSerieDe(ejecutado: SesionCompletada['ejercicios'][number]): {
	reps_reales: number;
	rir_declarado: number | null;
	reps_planificadas: number;
} {
	const reps_reales = ejecutado.reps_reales[ejecutado.reps_reales.length - 1] ?? 0;
	const rir_declarado = ejecutado.rir_declarado[ejecutado.rir_declarado.length - 1] ?? null;
	return { reps_reales, rir_declarado, reps_planificadas: ejecutado.reps_planificadas };
}

// "Llego holgado" = ultima serie con reps reales >= objetivo y rir >= 3.
// rir null = esa serie no participo del chequeo (la pregunta solo sale en
// la ultima serie de la sesion de chequeo), por lo que NO cuenta.
function cumplioCriterio(entrada: {
	reps_reales: number;
	rir_declarado: number | null;
	reps_planificadas: number;
}): boolean {
	if (entrada.rir_declarado === null) return false;
	if (entrada.rir_declarado < 3) return false;
	return entrada.reps_reales >= entrada.reps_planificadas;
}

// Sesion de chequeo historica: primera no cancelada de su semana,
// evaluada contra el historial previo (no se incluye a si misma).
function fueSesionDeChequeo(sesion: SesionCompletada, historialPrevio: SesionCompletada[]): boolean {
	if (sesion.cancelada_por_dolor) return false;
	const semana = inicioSemana(sesion.fecha);
	return !historialPrevio.some(
		(s) => !s.cancelada_por_dolor && inicioSemana(s.fecha) === semana,
	);
}

function cuentaChequeosCumplidos(
	historial: SesionCompletada[],
	sesionActual: SesionCompletada,
	ejercicio_id: string,
	esChequeoActual: boolean,
	n: number,
): { cumple: boolean; chequeosConsiderados: number } {
	const actuales: Array<{ fecha: number; cumple: boolean }> = [];
	if (esChequeoActual) {
		const ej = sesionActual.ejercicios.find((e) => e.ejercicio_id === ejercicio_id);
		if (ej) {
			const entrada = ultimaSerieDe(ej);
			if (entrada.rir_declarado !== null) {
				actuales.push({ fecha: sesionActual.fecha, cumple: cumplioCriterio(entrada) });
			}
		}
	}

	// Recorremos en orden ascendente para calcular el "historial previo"
	// de cada sesion. `obtenerHistorial` lo entrega descendente, invertimos.
	const ascendente = [...historial].sort((a, b) => a.fecha - b.fecha);
	const previas: SesionCompletada[] = [];
	for (const sesion of ascendente) {
		if (sesion.id === sesionActual.id) continue;
		const esChequeo = fueSesionDeChequeo(sesion, previas);
		if (!esChequeo) {
			previas.push(sesion);
			continue;
		}
		const ej = sesion.ejercicios.find((e) => e.ejercicio_id === ejercicio_id);
		if (ej) {
			const entrada = ultimaSerieDe(ej);
			if (entrada.rir_declarado !== null) {
				actuales.push({ fecha: sesion.fecha, cumple: cumplioCriterio(entrada) });
			}
		}
		previas.push(sesion);
	}

	actuales.sort((a, b) => b.fecha - a.fecha);
	const ultimas = actuales.slice(0, n);
	if (ultimas.length < n) return { cumple: false, chequeosConsiderados: ultimas.length };

	const todasCumplen = ultimas.every((s) => s.cumple);
	return { cumple: todasCumplen, chequeosConsiderados: ultimas.length };
}

// `regla` viene por argumento para que el modulo sea puro y testeable
// sin importar el JSON (mismo patron que progresion.ts con el objetivo).
export function evaluarProgresionesSugeridas(
	historial: SesionCompletada[],
	sesionActual: SesionCompletada,
	catalogo: Ejercicio[],
	regla: number,
	estados: EstadoEjercicio[] = [],
): SugerenciaProgresion[] {
	if (sesionActual.cancelada_por_dolor) return [];
	const esChequeo = esChequeoDeLaSesion(historial, sesionActual);
	if (!esChequeo) return [];

	const enReintroduccion = new Set(
		estados
			.filter((e) => (e.reintroduccion_sesiones_restantes ?? 0) > 0)
			.map((e) => e.ejercicio_id),
	);

	const candidatos: SugerenciaProgresion[] = [];
	for (const ejecutado of sesionActual.ejercicios) {
		const ejercicio = catalogo.find((e) => e.id === ejecutado.ejercicio_id);
		if (!ejercicio) continue;
		if (ejercicio.progresion_id === null) continue; // extremo de la cadena
		if (enReintroduccion.has(ejercicio.id)) continue; // volumen reducido

		const { cumple } = cuentaChequeosCumplidos(
			historial,
			sesionActual,
			ejercicio.id,
			true,
			regla,
		);
		if (!cumple) continue;

		candidatos.push({ ejercicio, destino_id: ejercicio.progresion_id });
	}

	// Por id: el foco recorre los items siempre igual y los tests no
	// dependen del orden de insercion del Set/Map.
	candidatos.sort((a, b) => (a.ejercicio.id < b.ejercicio.id ? -1 : 1));
	return candidatos;
}
