import { base } from '$app/paths';

export type ContextoMusica = 'fondo' | 'sesion';

const CLAVE_ACTIVADA = 'musica-activada';
const CLAVE_VOLUMEN = 'volumen-musica';
// 15%: al 50% tapaba demasiado. Asi no compite con TalkBack ni con los efectos.
const VOLUMEN_POR_DEFECTO = 0.15;

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	if (n > max) return max;
	return n;
}

export function musicaActivada(): boolean {
	try {
		return localStorage.getItem(CLAVE_ACTIVADA) !== '0';
	} catch {
		return true;
	}
}

export function establecerMusicaActivada(activada: boolean): void {
	try {
		localStorage.setItem(CLAVE_ACTIVADA, activada ? '1' : '0');
	} catch {
		// sin storage la preferencia no persiste
	}
	// Sin recargar: pausar si suena, reanudar si estaba apagada.
	if (typeof Audio === 'undefined') return;
	const audio = audioLazy();
	if (audio === null) return;
	if (activada) {
		intentarPlay(contextoDeseado);
	} else {
		try {
			audio.pause();
		} catch {
			// no-op
		}
	}
}

export function volumenMusica(): number {
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

export function establecerVolumenMusica(v: number): void {
	const n = clamp(v, 0, 1);
	try {
		localStorage.setItem(CLAVE_VOLUMEN, String(n));
	} catch {
		// sin storage el volumen no persiste
	}
	// Aplicar en vivo si hay un Audio sonando: feedback inmediato del slider.
	const audio = audioLazy();
	if (audio === null) return;
	try {
		audio.volume = n;
	} catch {
		// audio.volume readonly en algun navegador exotico
	}
}

// Lo que el caller pidio por ultima vez. Persiste aunque la musica este apagada.
let contextoDeseado: ContextoMusica = 'fondo';

// Contexto ya cargado en el elemento. Evita resetear el src (y reiniciar
// el loop) cuando ya coincide. No se compara audio.src directo: su getter
// devuelve la URL absoluta resuelta, que nunca iguala la ruta relativa.
let contextoCargado: ContextoMusica | null = null;

// Audio unico, lazy. Reutilizo el mismo elemento para cambiar el src
// sin destruir el cache del browser.
let audio: HTMLAudioElement | null = null;
// Ya intentamos play() y el gesto del usuario lo entrego. No re-registramos.
let desbloqueoRegistrado = false;

function audioLazy(): HTMLAudioElement | null {
	if (typeof Audio === 'undefined') return null;
	if (audio !== null) return audio;
	try {
		const a = new Audio();
		a.loop = true;
		a.preload = 'auto';
		a.volume = volumenMusica();
		// Si sesion.mp3 no esta, caemos a fondo. Si fondo tampoco, el evento
		// vuelve a dispararse pero contextoDeseado ya es 'fondo' y no hace nada.
		a.addEventListener('error', () => {
			if (contextoDeseado === 'sesion') {
				contextoDeseado = 'fondo';
				intentarPlay('fondo');
			}
		});
		audio = a;
		return a;
	} catch {
		return null;
	}
}

function srcPara(contexto: ContextoMusica): string {
	return `${base}/musica/${contexto}.mp3`;
}

function intentarPlay(contexto: ContextoMusica): void {
	if (typeof Audio === 'undefined') return;
	if (!musicaActivada()) return;
	const a = audioLazy();
	if (a === null) return;
	try {
		// Solo cambiamos src (y reiniciamos el loop) si el contexto difiere.
		if (contextoCargado !== contexto) {
			a.src = srcPara(contexto);
			contextoCargado = contexto;
		}
		const promesa = a.play();
		if (promesa) {
			void promesa.catch(() => {
				registrarDesbloqueo();
			});
		}
	} catch {
		// contrato: nunca lanza
	}
}

function registrarDesbloqueo(): void {
	if (desbloqueoRegistrado) return;
	if (typeof window === 'undefined') return;
	desbloqueoRegistrado = true;
	const onGesto = () => {
		// Quitar antes de reproducir: si el play vuelve a fallar (raro
		// tras un gesto) no re-entramos en bucle.
		window.removeEventListener('pointerdown', onGesto);
		window.removeEventListener('keydown', onGesto);
		intentarPlay(contextoDeseado);
	};
	window.addEventListener('pointerdown', onGesto, { once: true });
	window.addEventListener('keydown', onGesto, { once: true });
}

export function reproducirFondo(): void {
	contextoDeseado = 'fondo';
	intentarPlay('fondo');
}

export function reproducirSesion(): void {
	contextoDeseado = 'sesion';
	intentarPlay('sesion');
}

// Reanuda el contexto actual respetando el on/off. Usado al volver del background.
export function reanudar(): void {
	intentarPlay(contextoDeseado);
}

export function pausar(): void {
	if (typeof Audio === 'undefined') return;
	const a = audioLazy();
	if (a === null) return;
	try {
		a.pause();
	} catch {
		// no-op
	}
}
