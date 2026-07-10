// Procesar serie completada y avance al siguiente ejercicio. Cubre el
// progreso DENTRO de la sesion; el ciclo de vida vive en cierre.ts.

import type { EjercicioEjecutado, SesionEnCurso } from './schema.js';

// Entrada nueva en ejecutados para el slot actual. Tambien la usa
// dolor.ts cuando el dolor llega antes de la primera serie.
export function crearEjecutado(sesion: SesionEnCurso): EjercicioEjecutado {
	const slot = sesion.plan[sesion.indice_ejercicio];
	return {
		ejercicio_id: slot.ejercicio_id,
		series_planificadas: slot.series,
		series_completadas: 0,
		reps_planificadas: slot.reps_objetivo,
		reps_reales: [],
		rir_declarado: [],
		zonas_dolor_reportadas: [],
	};
}

function indiceEjecutadoActual(sesion: SesionEnCurso): number {
	const id = sesion.plan[sesion.indice_ejercicio].ejercicio_id;
	return sesion.ejecutados.findIndex((e) => e.ejercicio_id === id);
}

// Acumula la serie sin tocar IndexedDB (solo se escribe al cerrar).
// `rir_declarado` entra como numero o null si la serie no pregunto
// esfuerzo. `_ahora` queda reservado: la marca por serie no se persiste
// en MVP.
export function aplicarSerieCompletada(
	sesion: SesionEnCurso,
	reps_reales: number,
	rir_declarado: number | null,
	_ahora: number,
): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('aplicarSerieCompletada: no hay ejercicio en curso');
	}
	const ejecutados = [...sesion.ejecutados];
	let i = indiceEjecutadoActual(sesion);
	if (i === -1) {
		ejecutados.push(crearEjecutado(sesion));
		i = ejecutados.length - 1;
	}
	const actual = ejecutados[i];
	ejecutados[i] = {
		...actual,
		series_completadas: actual.series_completadas + 1,
		reps_reales: [...actual.reps_reales, reps_reales],
		rir_declarado: [...actual.rir_declarado, rir_declarado],
	};
	return { ...sesion, ejecutados, indice_serie: sesion.indice_serie + 1 };
}

// Posiciona los indices en el siguiente del plan.
export function pasarSiguienteEjercicio(sesion: SesionEnCurso, _ahora: number): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('pasarSiguienteEjercicio: la sesion ya no tiene ejercicio en curso');
	}
	return { ...sesion, indice_ejercicio: sesion.indice_ejercicio + 1, indice_serie: 0 };
}

// Reemplaza el ultimo `reps_reales` por un valor corregido, manteniendo
// `rir_declarado` intacto (la correccion es de la cantidad, no del esfuerzo).
export function corregirUltimaSerie(
	sesion: SesionEnCurso,
	reps_reales: number,
	_ahora: number,
): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('corregirUltimaSerie: no hay ejercicio en curso');
	}
	const id = sesion.plan[sesion.indice_ejercicio].ejercicio_id;
	const i = sesion.ejecutados.findIndex((e) => e.ejercicio_id === id);
	if (i === -1) {
		throw new Error('corregirUltimaSerie: el ejercicio actual no tiene series registradas');
	}
	const actual = sesion.ejecutados[i];
	if (actual.reps_reales.length === 0) {
		throw new Error('corregirUltimaSerie: no hay serie para corregir');
	}
	const correjidos = [...actual.reps_reales];
	correjidos[correjidos.length - 1] = reps_reales;
	const ejecutados = [...sesion.ejecutados];
	ejecutados[i] = { ...actual, reps_reales: correjidos };
	return { ...sesion, ejecutados };
}
