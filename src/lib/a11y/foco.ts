/**
 * Mueve el foco al elemento principal de la pagina.
 * ADR-0009: usar en $effect, no en onMount.
 */

let suprimirProximoAnuncioDeRuta = false;

export function enfocarPrincipal(ref: HTMLElement | null | undefined): void {
	if (ref instanceof HTMLElement) suprimirProximoAnuncioDeRuta = true;
	ref?.focus();
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