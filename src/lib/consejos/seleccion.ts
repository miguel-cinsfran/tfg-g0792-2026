import { CONSEJOS } from './datos';
import type { Consejo, FamiliaConsejo } from './datos';

export interface OpcionesSeleccion {
	// Seam de prueba: produccion nunca lo pasa; el pool por defecto es CONSEJOS.
	pool?: readonly Consejo[];
	familia?: FamiliaConsejo;
}

export function elegirConsejo(mostrados: readonly string[], opciones?: OpcionesSeleccion): string {
	const pool = opciones?.pool ?? CONSEJOS;
	const elegibles = opciones?.familia === undefined ? pool : pool.filter((c) => c.familia === opciones.familia);
	const noMostrado = elegibles.find((c) => !mostrados.includes(c.id));
	if (noMostrado !== undefined) return noMostrado.id;
	// Todos los elegibles fueron mostrados: se reinicia el pool.
	const primero = elegibles[0];
	if (primero === undefined) {
		throw new Error('elegirConsejo sin consejos elegibles');
	}
	return primero.id;
}
