// Vista previa de la proxima sesion sin iniciarla. Composicion de
// split + tipo + generador, ya sobre el motor real.

import type {
	Ejercicio,
	EjercicioPlanificado,
	EstadoEjercicio,
	Patron,
	Perfil,
	SesionCompletada,
	TipoSesion,
} from './schema.js';
import { elegirSplit, determinarTipoSesion } from './split.js';
import { generarSesion } from './generador.js';

export interface VistaPrevia {
	tipo: TipoSesion;
	plan: EjercicioPlanificado[];
	// La UI avisa si algun patron quedo sin ejercicios disponibles.
	patrones_sin_pool: Patron[];
}

// `historial` son las sesiones recientes para el filtro de novedad
// (el generador recorta solo la ventana que necesita).
export function obtenerVistaPrevia(
	perfil: Perfil,
	estados: EstadoEjercicio[],
	historial: SesionCompletada[],
	ultimaSesion: SesionCompletada | null,
	catalogo: Ejercicio[],
	_ahora: number,
): VistaPrevia {
	const { split } = elegirSplit(perfil.dias_semana, perfil.nivel_experiencia);
	const tipo = determinarTipoSesion(split, ultimaSesion);
	const generacion = generarSesion(tipo, perfil, catalogo, estados, historial);
	return {
		tipo,
		plan: generacion.plan,
		patrones_sin_pool: generacion.patrones_sin_pool,
	};
}
