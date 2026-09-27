/**
 * Mueve el foco al elemento principal de la pagina.
 * ADR-0009: usar en $effect, no en onMount.
 */

let suprimirProximoAnuncioDeRuta = false;
// El h1 que la pagina enfoco en su efecto. RouteAnnouncer lo reaplica en
// afterNavigate: en carga en frio reset_focus de SvelteKit corre dentro
// de navigate, o sea DESPUES del efecto, y le roba el foco al body.
let focoPendiente: HTMLElement | null = null;

export function enfocarPrincipal(ref: HTMLElement | null | undefined): void {
	if (ref instanceof HTMLElement) {
		suprimirProximoAnuncioDeRuta = true;
		focoPendiente = ref;
	}
	ref?.focus();
}

/**
 * Consume el foco pendiente y retorna si quedo donde tenia que quedar.
 * true si no habia pendiente o si el foco esta en manos de la persona;
 * false si el elemento pendiente salio del documento y el foco quedo
 * perdido (RouteAnnouncer anuncia el titulo en ese caso).
 */
export function reaplicarFocoPendiente(): boolean {
	const pendiente = focoPendiente;
	focoPendiente = null;
	if (!pendiente) return true;
	const activo = document.activeElement;
	// La persona pudo mover el foco por su cuenta mientras tanto:
	// robarle el foco seria peor que el defecto que se esta tapando.
	if (activo instanceof HTMLElement && activo !== document.body) return true;
	if (!pendiente.isConnected) return false;
	pendiente.focus();
	return document.activeElement === pendiente;
}

/** Lee si el proximo anuncio de ruta debe suprimirse. */
export function obtenerSupresionAnuncioDeRuta(): boolean {
	return suprimirProximoAnuncioDeRuta;
}

/** Consume la bandera: retorna true si debe suprimirse y la resetea. */
export function consumirSupresionAnuncioDeRuta(): boolean {
	if (suprimirProximoAnuncioDeRuta) {
		suprimirProximoAnuncioDeRuta = false;
		return true;
	}
	return false;
}

/** Resetea la bandera a false (para tests). */
export function resetearSupresionAnuncioDeRuta(): void {
	suprimirProximoAnuncioDeRuta = false;
}
