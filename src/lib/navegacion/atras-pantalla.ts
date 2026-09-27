// La pantalla visible registra aca su manejador de volver para que el
// atras del telefono ejecute lo mismo que el boton visible (mismo
// destino y mismo sonido) en vez de retroceder a ciegas por historial.
// Pila por si dos botones conviven: manda el ultimo montado y al
// desmontarse vuelve el anterior.
export type ManejadorVolver = () => void;

const pila: ManejadorVolver[] = [];

export function registrarVolver(manejador: ManejadorVolver): void {
	pila.push(manejador);
}

export function quitarVolver(manejador: ManejadorVolver): void {
	const indice = pila.lastIndexOf(manejador);
	if (indice >= 0) pila.splice(indice, 1);
}

export function obtenerVolver(): ManejadorVolver | null {
	return pila.length > 0 ? pila[pila.length - 1] : null;
}

/** Solo para tests: vacia la pila entre casos. */
export function reiniciarVolver(): void {
	pila.length = 0;
}
