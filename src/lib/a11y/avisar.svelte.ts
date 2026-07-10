// Canal unico para avisar al usuario: anuncia al lector (polite o
// assertive segun tipo) Y empuja al store del aviso visible (espejo
// en pantalla con aria-hidden, asi no se duplica la voz). El contrato
// de la region aria-live global no cambia; este modulo la USA.
import { anunciarPolite, anunciarAssertive } from './live-region';

export type TipoAviso = 'exito' | 'error';

export interface Aviso {
	mensaje: string;
	tipo: TipoAviso;
	// Cambia con cada `avisar` para que el componente reinicie su timer.
	id: number;
}

let aviso = $state<Aviso | null>(null);
let contador = 0;

/** Lee el aviso visible actual. Reactivo via $state. */
export function obtenerAvisoVisible(): Aviso | null {
	return aviso;
}

export function avisar(mensaje: string, tipo: TipoAviso = 'exito'): void {
	if (mensaje === '') return;
	contador = contador + 1;
	aviso = { mensaje, tipo, id: contador };
	if (tipo === 'error') {
		anunciarAssertive(mensaje);
	} else {
		anunciarPolite(mensaje);
	}
}

/** Limpia el aviso visible. La region aria-live mantiene su contrato propio. */
export function limpiarAvisoVisible(): void {
	aviso = null;
}

/** Solo para tests: reinicia el modulo. */
export function resetearAvisoVisible(): void {
	aviso = null;
	contador = 0;
}
