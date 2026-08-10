import type { Perfil } from '$lib/motor/schema';
import { CONSEJOS } from './datos';
import type { Consejo } from './datos';
import { elegirConsejo } from './seleccion';
import {
	consejosActivados,
	guardarMostrados,
	incrementarContadorArranques,
	leerMostrados,
} from './preferencias';

let consejoActual: Consejo | null = null;
let consejoAnunciadoFlag = false;

// El primer arranque crea el perfil: el contador evita gastar el pool
// durante el onboarding. El flag de anuncio es "una vez por corrida".
export function prepararConsejoDelArranque(perfil: Perfil | null): void {
	const contador = incrementarContadorArranques();
	consejoAnunciadoFlag = false;
	if (perfil === null || !consejosActivados() || contador < 2) {
		consejoActual = null;
		return;
	}
	const mostrados = leerMostrados();
	const id = elegirConsejo(mostrados);
	const elegido = CONSEJOS.find((c) => c.id === id);
	if (elegido === undefined) {
		consejoActual = null;
		return;
	}
	consejoActual = elegido;
	// Si el id ya estaba mostrado, el pool se habia agotado: se reinicia.
	guardarMostrados(mostrados.includes(id) ? [id] : [...mostrados, id]);
}

export function consejoDelArranque(): Consejo | null {
	return consejoActual;
}

export function consejoAnunciado(): boolean {
	return consejoAnunciadoFlag;
}

export function marcarConsejoAnunciado(): void {
	consejoAnunciadoFlag = true;
}
