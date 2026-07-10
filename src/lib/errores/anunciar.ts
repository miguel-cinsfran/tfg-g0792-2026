// Anuncio assertivo + sonido de error para catch de errores reales. El
// code se traduce a mensaje via mensajePara; nunca lanza.
import { anunciarAssertive } from '$lib/a11y/live-region';
import { sonar } from '$lib/sonido/reproducir';
import { mensajePara } from './mensajes';

export function anunciarError(code: string): void {
	anunciarAssertive(mensajePara(code));
	sonar('error');
}
