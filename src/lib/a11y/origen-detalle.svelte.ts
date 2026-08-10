// Origen del detalle en memoria (ADR-0007): al navegar lista -> detalle
// se guarda el id del ejercicio de origen; al volver a la lista se
// consume y se limpia. Sin persistencia: la memoria sobrevive a
// history.back() dentro de la sesion SPA (adapter-static) y nada mas.

let origen = $state<string | null>(null);

export function registrarOrigenDetalle(id: string): void {
	origen = id;
}

export function leerOrigenDetalle(): string | null {
	return origen;
}

export function limpiarOrigenDetalle(): void {
	origen = null;
}
