// Logica pura del boton ATRAS de Android. La funcion ("que hago dado
// ruta + estado") se testea aislada; el wiring con setTimeout/clearTimeout,
// App.minimizeApp y el dispatch del evento cancelable vive en +layout.svelte.
export type AccionAtras =
	| { tipo: 'ir-a-inicio' }
	| { tipo: 'armar-doble-atras' }
	| { tipo: 'minimizar' }
	| { tipo: 'atras-lineal' }
	| { tipo: 'minimizar-lineal' }
	| { tipo: 'volver-pantalla' };

export type EstadoDobleAtras = 'desarmado' | 'armado';

export function decidirAccionAtras(
	pathname: string,
	armado: EstadoDobleAtras,
	esPestana: boolean,
	esInicio: boolean,
	hayManejador = false,
): AccionAtras {
	if (esPestana) {
		if (esInicio) {
			return armado === 'armado' ? { tipo: 'minimizar' } : { tipo: 'armar-doble-atras' };
		}
		return { tipo: 'ir-a-inicio' };
	}
	// Con boton visible registrado, el telefono ejecuta su manejador
	// (mismo destino que el toque); sin el, lo de siempre.
	if (hayManejador) return { tipo: 'volver-pantalla' };
	// history.back vs minimize lo decide el caller segun canGoBack.
	return { tipo: 'atras-lineal' };
}

/** Plazo del doble toque en ms. Determinista para tests y para el wiring. */
export const PLAZO_DOBLE_ATRAS_MS = 2000;
