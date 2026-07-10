// Progresion y regresion manual via progresion_id / regresion_id del
// catalogo. La UI lo invoca desde el detalle del ejercicio en Biblioteca.

import type { Ejercicio, EstadoEjercicio, Objetivo } from './schema.js';
import { parametrosDeObjetivo } from './reglas.js';

export type ResultadoProgresion =
	// Extremo de la cadena: la UI no cambia nada.
	| { tipo: 'extremo' }
	// Hay variante destino: la UI muestra su descripcion y, al confirmar,
	// la db persiste estado_nuevo. El origen queda como esta (ambos en el pool).
	| { tipo: 'cambio'; destino: Ejercicio; estado_nuevo: EstadoEjercicio };

function cambiarHacia(
	destinoId: string | null,
	catalogo: Ejercicio[],
	objetivo: Objetivo,
): ResultadoProgresion {
	if (destinoId === null) return { tipo: 'extremo' };
	const destino = catalogo.find((e) => e.id === destinoId);
	if (!destino) {
		// Referencia colgada del catalogo semilla: de facto es el extremo.
		return { tipo: 'extremo' };
	}
	return {
		tipo: 'cambio',
		destino,
		estado_nuevo: {
			ejercicio_id: destino.id,
			series_objetivo: parametrosDeObjetivo(objetivo).series_por_ejercicio,
			reps_objetivo: destino.reps_iniciales,
			bloqueado: false,
			razon_bloqueo: null,
			fecha_bloqueo: null,
			fecha_revision: null,
			fecha_ultimo_uso: null,
		},
	};
}

export function progresar(
	ejercicio: Ejercicio,
	catalogo: Ejercicio[],
	objetivo: Objetivo,
): ResultadoProgresion {
	return cambiarHacia(ejercicio.progresion_id, catalogo, objetivo);
}

// Espejo de progresar, siguiendo regresion_id.
export function retroceder(
	ejercicio: Ejercicio,
	catalogo: Ejercicio[],
	objetivo: Objetivo,
): ResultadoProgresion {
	return cambiarHacia(ejercicio.regresion_id, catalogo, objetivo);
}
