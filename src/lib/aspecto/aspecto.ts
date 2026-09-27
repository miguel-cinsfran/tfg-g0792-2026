// Aspecto de la app (claro, oscuro, alto contraste). Preferencia de
// dispositivo en localStorage, como la de pantalla encendida: sobrevive
// a "borrar todo". Todo acceso a localStorage va en try/catch y las
// llamadas al plugin nativo son best-effort y nunca lanzan.

import { Capacitor } from '@capacitor/core';
import { M } from '$lib/mensajes/ui';

export type PreferenciaAspecto = 'sistema' | 'claro' | 'oscuro' | 'contraste';
export type TemaAspecto = 'claro' | 'oscuro' | 'contraste';

const CLAVE_ASPECTO = 'aspecto';
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

// Fondo de cada tema: la meta theme-color y la barra de estado nativa
// usan el mismo valor para que no se vea un corte.
const COLOR_TEMA: Record<TemaAspecto, string> = {
	claro: '#F7F4EE',
	oscuro: '#1C1917',
	contraste: '#000000',
};

export function leerAspecto(): PreferenciaAspecto {
	try {
		const crudo = localStorage.getItem(CLAVE_ASPECTO);
		if (crudo === 'sistema' || crudo === 'claro' || crudo === 'oscuro' || crudo === 'contraste') {
			return crudo;
		}
		return 'sistema';
	} catch {
		return 'sistema';
	}
}

export function guardarAspecto(preferencia: PreferenciaAspecto): void {
	try {
		localStorage.setItem(CLAVE_ASPECTO, preferencia);
	} catch {
		// Sin persistencia: el tema queda aplicado solo esta corrida.
	}
}

/** Etiqueta visible de la preferencia guardada (la fila del indice la muestra). */
export function etiquetaAspecto(preferencia: PreferenciaAspecto): string {
	switch (preferencia) {
		case 'claro':
			return M.configuracion.aspecto.claroEtiqueta;
		case 'oscuro':
			return M.configuracion.aspecto.oscuroEtiqueta;
		case 'contraste':
			return M.configuracion.aspecto.contrasteEtiqueta;
		default:
			return M.configuracion.aspecto.sistemaEtiqueta;
	}
}

/** La preferencia "sistema" se resuelve segun el telefono; el resto es directa. */
export function resolverTemaAspecto(preferencia: PreferenciaAspecto, sistemaEnOscuro: boolean): TemaAspecto {
	if (preferencia === 'claro' || preferencia === 'oscuro' || preferencia === 'contraste') {
		return preferencia;
	}
	return sistemaEnOscuro ? 'oscuro' : 'claro';
}

function sistemaPrefiereOscuro(): boolean {
	try {
		return window.matchMedia(CONSULTA_OSCURO).matches;
	} catch {
		return false;
	}
}

/** Fija data-tema en <html>, la meta theme-color y la barra nativa. Nunca lanza. */
export async function aplicarTema(tema: TemaAspecto): Promise<void> {
	try {
		document.documentElement.setAttribute('data-tema', tema);
	} catch {
		// Sin documento no hay nada que pintar.
	}
	try {
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_TEMA[tema]);
	} catch {
		// Sin meta no hay color que actualizar.
	}
	await aplicarBarraNativa(tema);
}

async function aplicarBarraNativa(tema: TemaAspecto): Promise<void> {
	try {
		if (!Capacitor.isNativePlatform()) return;
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		await StatusBar.setBackgroundColor({ color: COLOR_TEMA[tema] });
		// Style.Light es texto oscuro para fondos claros (definitions.d.ts
		// de @capacitor/status-bar, lineas 54 a 58): solo el claro lo usa.
		await StatusBar.setStyle({ style: tema === 'claro' ? Style.Light : Style.Dark });
	} catch {
		// Web o puente no disponible: la web ya quedo con el tema.
	}
}

/** Lee la preferencia, la resuelve y la aplica. Llamar una vez al arrancar. */
export async function aplicarPreferenciaAspecto(): Promise<void> {
	await aplicarTema(resolverTemaAspecto(leerAspecto(), sistemaPrefiereOscuro()));
}

/**
 * Mientras la preferencia sea "sistema", re-aplica al cambiar el ajuste
 * del telefono; con preferencia explicita no hace nada. Devuelve como
 * detener la escucha.
 */
export function iniciarEscuchaSistema(): () => void {
	try {
		const consulta = window.matchMedia(CONSULTA_OSCURO);
		const alCambiar = (evento: MediaQueryListEvent): void => {
			if (leerAspecto() !== 'sistema') return;
			void aplicarTema(evento.matches ? 'oscuro' : 'claro');
		};
		consulta.addEventListener('change', alCambiar);
		return () => {
			try {
				consulta.removeEventListener('change', alCambiar);
			} catch {
				// Si no se puede desuscribir, la escucha queda; es inocua.
			}
		};
	} catch {
		return () => {};
	}
}
