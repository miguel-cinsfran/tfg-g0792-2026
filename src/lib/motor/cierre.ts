// Cierre de sesion y ciclo de vida (crear, cancelar, cerrar). El progreso
// dentro de la sesion vive en serie.ts. Consumidor: store sesion.svelte.ts.

import type {
	EjercicioPlanificado,
	EstadoEjercicio,
	SesionCompletada,
	SesionEnCurso,
	TipoSesion,
} from './schema.js';

export interface ResultadoCierre {
	sesion: SesionCompletada;
	// Estados con fecha_ultimo_uso = ahora (creados con valores del plan
	// si no existian). La db los persiste con la sesion en una transaccion.
	estados: EstadoEjercicio[];
}

export function crearEstadoInicial(
	plan: EjercicioPlanificado[],
	tipo: TipoSesion,
	ahora: number,
): SesionEnCurso {
	return {
		tipo,
		fecha_inicio: ahora,
		plan,
		indice_ejercicio: 0,
		indice_serie: 0,
		ejecutados: [],
		cancelada_por_dolor: false,
	};
}

// Marca la sesion como cancelada por dolor. El registro con datos parciales
// lo produce despues cerrarSesionEnCurso, mismo camino que el cierre normal.
export function cancelarSesionEnCurso(sesion: SesionEnCurso, _ahora: number): SesionEnCurso {
	return { ...sesion, cancelada_por_dolor: true };
}

// `estadosPrevios` se lee fresco de la db al cerrar: no se guarda snapshot
// en SesionEnCurso porque quedaria viejo si hubo bloqueos durante la sesion.
export function cerrarSesionEnCurso(
	sesion: SesionEnCurso,
	estadosPrevios: EstadoEjercicio[],
	ahora: number,
): ResultadoCierre {
	const completada: SesionCompletada = {
		id: `sesion-${ahora}`,
		fecha: ahora,
		tipo: sesion.tipo,
		ejercicios: sesion.ejecutados,
		// Piso 0: un reloj que retrocedio (ajuste manual o cambio de huso a
		// mitad de sesion) no dice cuanto duro en realidad, y un negativo
		// persistido para siempre en el historial es peor que un cero.
		duracion_minutos: Math.max(0, Math.round((ahora - sesion.fecha_inicio) / 60_000)),
		cancelada_por_dolor: sesion.cancelada_por_dolor,
	};

	const previoPorId = new Map(estadosPrevios.map((e) => [e.ejercicio_id, e]));
	// Cero series completadas = no se entreno nada de ese ejercicio (p.ej.
	// dolor reportado antes de la primera serie, dolor.ts registrarZonasDolor).
	// El registro sigue en sesion.ejercicios para no perder el dato, pero
	// el cierre no le toca el estado: ni fecha, ni reintroduccion, ni alta.
	const estados: EstadoEjercicio[] = sesion.ejecutados
		.filter((ejecutado) => ejecutado.series_completadas > 0)
		.map((ejecutado) => {
			const previo = previoPorId.get(ejecutado.ejercicio_id);
			if (previo) {
				// Reintroduccion post-dolor: si estaba en reintroduccion,
				// decremento. Al llegar a 0 normalizo a null para que la
				// proxima sesion reciba volumen completo.
				const restantesPrevios = previo.reintroduccion_sesiones_restantes ?? null;
				const restantesNormalizado =
					restantesPrevios !== null && restantesPrevios > 0 ? restantesPrevios - 1 : restantesPrevios;
				const siguientesRestantes =
					restantesNormalizado === 0 ? null : restantesNormalizado;
				return {
					...previo,
					fecha_ultimo_uso: ahora,
					reintroduccion_sesiones_restantes: siguientesRestantes,
				};
			}
			// Primer uso: se crea desde lo planificado. No aplica reintroduccion.
			return {
				ejercicio_id: ejecutado.ejercicio_id,
				series_objetivo: ejecutado.series_planificadas,
				reps_objetivo: ejecutado.reps_planificadas,
				bloqueado: false,
				razon_bloqueo: null,
				fecha_bloqueo: null,
				fecha_revision: null,
				fecha_ultimo_uso: ahora,
			};
		});

	return { sesion: completada, estados };
}
