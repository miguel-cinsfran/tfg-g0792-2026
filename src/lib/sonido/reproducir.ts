// Sonidos de la interfaz: efectos de un disparo. Cada evento carga su
// .mp3 desde static/sonidos/ al primer uso y queda en cache. Mientras
// falten los .mp3, sonar() no-opea en silencio.
//
// Contrato: NUNCA lanza. Archivo ausente, autoplay bloqueado, navegador
// sin Audio o localStorage no disponible fallan en silencio.
//
// `sonidosActivados` es el interruptor maestro (off no suena nada). El
// volumen es el nivel cuando esta on (volumen 0 no es lo mismo que off).

import { base } from '$app/paths';

export type EventoSonido =
	| 'inicio-app'
	| 'cambio-pestania'
	| 'inicio-serie'
	| 'fin-descanso'
	| 'sesion-completada'
	| 'racha'
	| 'logro'
	| 'serie-completada'
	| 'inicio-descanso'
	| 'error'
	| 'ejercicio-desbloqueado'
	| 'navegacion-atras'
	| 'dolor-registrado'
	| 'tic'
	| 'tac'
	| 'seleccion'
	| 'papelera'
	| 're-evaluar';

const CLAVE_AJUSTE = 'sonidos-activados';
const CLAVE_VOLUMEN = 'volumen-efectos';
const VOLUMEN_POR_DEFECTO = 1;

export function sonidosActivados(): boolean {
	try {
		return localStorage.getItem(CLAVE_AJUSTE) !== '0';
	} catch {
		return true;
	}
}

export function establecerSonidos(activados: boolean): void {
	try {
		localStorage.setItem(CLAVE_AJUSTE, activados ? '1' : '0');
	} catch {
		// sin storage la preferencia no persiste
	}
}

export function volumenEfectos(): number {
	try {
		const crudo = localStorage.getItem(CLAVE_VOLUMEN);
		if (crudo === null) return VOLUMEN_POR_DEFECTO;
		const n = Number(crudo);
		if (!Number.isFinite(n)) return VOLUMEN_POR_DEFECTO;
		return clamp(n, 0, 1);
	} catch {
		return VOLUMEN_POR_DEFECTO;
	}
}

export function establecerVolumenEfectos(v: number): void {
	const n = clamp(v, 0, 1);
	try {
		localStorage.setItem(CLAVE_VOLUMEN, String(n));
	} catch {
		// sin storage el volumen no persiste
	}
}

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	if (n > max) return max;
	return n;
}

// Un Audio por evento; null marca "sin archivo" para no reintentar.
const cache = new Map<EventoSonido, HTMLAudioElement | null>();

export function sonar(evento: EventoSonido): void {
	if (typeof Audio === 'undefined') return;
	if (!sonidosActivados()) return;
	const audio = obtenerAudio(evento);
	if (audio === null) return;
	try {
		audio.currentTime = 0;
		// Volumen justo antes de play para que un cambio de preferencia
		// tome efecto sin recargar el Audio.
		audio.volume = volumenEfectos();
		const promesa = audio.play();
		if (promesa) void promesa.catch(() => {});
	} catch {
		// contrato: nunca lanza
	}
}

// Crea y cachea el Audio sin reproducir. La primera reproduccion de un
// Audio "frio" en la WebView de Capacitor puede perderse; precargar()
// fuerza la carga para que cuando termine el descanso ya este listo.
export function precargar(evento: EventoSonido): void {
	if (typeof Audio === 'undefined') return;
	obtenerAudio(evento);
}

// Comparte la logica entre sonar() y precargar(). Devuelve null si el
// evento ya fallo antes (no reintenta) o si no hay Audio en el entorno.
function obtenerAudio(evento: EventoSonido): HTMLAudioElement | null {
	let audio = cache.get(evento);
	if (audio !== undefined) return audio;
	audio = new Audio(`${base}/sonidos/${evento}.mp3`);
	audio.preload = 'auto';
	audio.addEventListener('error', () => {
		cache.set(evento, null);
	});
	cache.set(evento, audio);
	try {
		audio.load();
	} catch {
		// si load() no existe, el Audio queda creado y el cache poblada
	}
	return audio;
}
