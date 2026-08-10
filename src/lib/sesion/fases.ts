// Logica pura de la maquina de fases de la sesion ("que hago dado fase y
// evento"). Se testea aislada; el wiring (Dexie, anuncios, sonido,
// haptica) vive en +page.svelte, mismo patron que atras-telefono.ts.

// Lista unica de fases, de la que se deriva el tipo. El invariante de
// foco de la ruta la recorre, asi que una fase que se agregue aca queda
// cubierta sin mantener una segunda lista que se desincronice callada.
export const SUBVISTAS = [
	'REANUDAR',
	'EJERCICIO',
	'POST_SERIE',
	'DESCANSO',
	'DOLOR_ZONAS',
	'DOLOR_SUSTITUTO',
	'DOLOR_POOL',
	'CIERRE',
] as const;

export type Subvista = (typeof SUBVISTAS)[number];

export type OrigenDolor = 'EJERCICIO' | 'DESCANSO';

export type Evento =
	| { tipo: 'reanudar' }
	| { tipo: 'empezarNueva' }
	// cerrarSerie lleva esUltimaSerieDelEjercicio porque el par
	// {mostrarPreguntaEsfuerzo, esFinDeSesion} no discrimina la rama
	// ultima serie del ejercicio -> EJERCICIO. Las tres banderas las arma
	// armarEventoCerrarSerie; la maquina no conoce el store.
	| {
			tipo: 'cerrarSerie';
			mostrarPreguntaEsfuerzo: boolean;
			esFinDeSesion: boolean;
			esUltimaSerieDelEjercicio: boolean;
	  }
	| { tipo: 'continuarPostSerie'; esFinDeSesion: boolean }
	| { tipo: 'finDescanso' }
	| { tipo: 'abrirDolor'; desde: OrigenDolor }
	| { tipo: 'confirmarZonas'; haySustituto: boolean }
	| { tipo: 'cancelarDolorZonas' }
	| { tipo: 'continuarSustituto' }
	| { tipo: 'interrumpirPorDolor' }
	| { tipo: 'omitirPatron'; esFinDeSesion: boolean }
	| { tipo: 'revisarZonas' }
	| { tipo: 'cancelarPostSerie' }
	| { tipo: 'salir' };

export type Contexto = { origenDolor: OrigenDolor | null };

// Datos planos para armar el evento cerrarSerie. Unica definicion de
// esUltimaSerieDelEjercicio, esFinDeSesion y mostrarPreguntaEsfuerzo: el
// componente los deriva llamando esta funcion en vez de escribir la
// expresion en cada sitio.
export type DatosCierreSerie = {
	indiceEjercicio: number;
	totalEjercicios: number;
	serieCompletada: number;
	totalSeries: number;
	esChequeo: boolean;
};

export function armarEventoCerrarSerie(
	datos: DatosCierreSerie,
): Extract<Evento, { tipo: 'cerrarSerie' }> {
	const esUltimaSerieDelEjercicio = datos.serieCompletada >= datos.totalSeries;
	const esUltimoEjercicio = datos.indiceEjercicio === datos.totalEjercicios - 1;
	return {
		tipo: 'cerrarSerie',
		esUltimaSerieDelEjercicio,
		esFinDeSesion: esUltimaSerieDelEjercicio && esUltimoEjercicio,
		mostrarPreguntaEsfuerzo: datos.esChequeo && esUltimaSerieDelEjercicio,
	};
}

// `sin-cambio` existe en el tipo pero no lo produce ninguna transicion
// hoy: las guardas de validacion ("sin zonas", "sin esfuerzo") son
// cableado del componente, no decisiones de fase.
export type Resultado =
	| { tipo: 'ir-a'; subvista: Subvista }
	| { tipo: 'sin-cambio' }
	| { tipo: 'error'; evento: Evento['tipo']; subvista: Subvista };

export function siguienteSubvista(
	subvista: Subvista,
	evento: Evento,
	contexto?: Contexto,
): Resultado {
	// `salir` -> CIERRE desde toda fase activa (CIERRE ya es la salida y
	// no transiciona). Queda modelado sin consumo: hoy no existe handler
	// que cierre sin cancelar/cerrar.
	switch (subvista) {
		case 'REANUDAR': {
			if (evento.tipo === 'reanudar' || evento.tipo === 'empezarNueva') {
				return { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'EJERCICIO': {
			if (evento.tipo === 'cerrarSerie') {
				// Prioridad maxima de la rama: la pregunta solo sale en la
				// ultima serie del ejercicio, asi que manda sobre el resto.
				if (evento.mostrarPreguntaEsfuerzo) {
					return { tipo: 'ir-a', subvista: 'POST_SERIE' };
				}
				if (evento.esFinDeSesion) {
					return { tipo: 'ir-a', subvista: 'CIERRE' };
				}
				if (evento.esUltimaSerieDelEjercicio) {
					return { tipo: 'ir-a', subvista: 'EJERCICIO' };
				}
				return { tipo: 'ir-a', subvista: 'DESCANSO' };
			}
			// `desde` es dato del cableado (setea origenDolor al abrir el
			// reporte); no se valida contra la fase: el reporte solo se
			// abre desde EJERCICIO o DESCANSO y siempre computa `desde` de
			// la propia subvista.
			if (evento.tipo === 'abrirDolor') {
				return { tipo: 'ir-a', subvista: 'DOLOR_ZONAS' };
			}
			if (evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'POST_SERIE': {
			if (evento.tipo === 'continuarPostSerie') {
				return evento.esFinDeSesion
					? { tipo: 'ir-a', subvista: 'CIERRE' }
					: { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'cancelarPostSerie') {
				return { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'DESCANSO': {
			if (evento.tipo === 'finDescanso') {
				return { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'abrirDolor') {
				return { tipo: 'ir-a', subvista: 'DOLOR_ZONAS' };
			}
			if (evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'DOLOR_ZONAS': {
			if (evento.tipo === 'confirmarZonas') {
				return evento.haySustituto
					? { tipo: 'ir-a', subvista: 'DOLOR_SUSTITUTO' }
					: { tipo: 'ir-a', subvista: 'DOLOR_POOL' };
			}
			if (evento.tipo === 'cancelarDolorZonas') {
				// Vuelve a la fase de origen del reporte; sin contexto
				// valido, error en vez de saltar a EJERCICIO por defecto.
				const origen = contexto?.origenDolor;
				if (origen === null || origen === undefined) {
					return eventoInvalido(evento, subvista);
				}
				return { tipo: 'ir-a', subvista: origen };
			}
			if (evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'DOLOR_SUSTITUTO': {
			if (evento.tipo === 'continuarSustituto') {
				return { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'revisarZonas') {
				return { tipo: 'ir-a', subvista: 'DOLOR_ZONAS' };
			}
			if (evento.tipo === 'interrumpirPorDolor' || evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'DOLOR_POOL': {
			if (evento.tipo === 'omitirPatron') {
				return evento.esFinDeSesion
					? { tipo: 'ir-a', subvista: 'CIERRE' }
					: { tipo: 'ir-a', subvista: 'EJERCICIO' };
			}
			if (evento.tipo === 'revisarZonas') {
				return { tipo: 'ir-a', subvista: 'DOLOR_ZONAS' };
			}
			if (evento.tipo === 'interrumpirPorDolor' || evento.tipo === 'salir') {
				return { tipo: 'ir-a', subvista: 'CIERRE' };
			}
			return eventoInvalido(evento, subvista);
		}
		case 'CIERRE': {
			return eventoInvalido(evento, subvista);
		}
	}
}

function eventoInvalido(evento: Evento, subvista: Subvista): Resultado {
	return { tipo: 'error', evento: evento.tipo, subvista };
}
