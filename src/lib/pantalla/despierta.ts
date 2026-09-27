// Mantener la pantalla encendida solo durante el entrenamiento.
// Preferencia de dispositivo en localStorage (misma excepcion que el
// audio: debe sobrevivir a "borrar todo"). Sin clave guardada viene
// activada: el entrenamiento se mira con las manos ocupadas. Quien la
// apago (clave '0') conserva su eleccion. El plugin puede no estar
// disponible (web, WebView vieja): todas las llamadas son best-effort
// y nunca lanzan. Metodos segun definitions.d.ts de
// @capacitor-community/keep-awake: keepAwake() impide el atenuado,
// allowSleep() lo permite.

import { KeepAwake } from '@capacitor-community/keep-awake';

const CLAVE_AJUSTE = 'pantalla-encendida';

export function pantallaEncendidaActivada(): boolean {
	try {
		return localStorage.getItem(CLAVE_AJUSTE) !== '0';
	} catch {
		return true;
	}
}

/** Persiste la eleccion sin tocar el plugin: el efecto vive solo en /sesion. */
export function establecerPantallaEncendida(activada: boolean): void {
	try {
		localStorage.setItem(CLAVE_AJUSTE, activada ? '1' : '0');
	} catch {
		// Sin persistencia no hay nada que guardar.
	}
}

/** Entrada a /sesion: si la preferencia sigue activada, pide keepAwake. */
export async function aplicarAlEntrarSesion(): Promise<void> {
	if (!pantallaEncendidaActivada()) return;
	try {
		await KeepAwake.keepAwake();
	} catch {
		// No soportado: no hay nada que hacer.
	}
}

/** Salida de /sesion: libera siempre, vuelva o no a pedirse despues. */
export async function aplicarAlSalirSesion(): Promise<void> {
	try {
		await KeepAwake.allowSleep();
	} catch {
		// No soportado: no hay nada que hacer.
	}
}

/** Entrar, salir o nada segun el cambio de ruta. Pura para probarla. */
export function transicionSesion(
	anterior: string | null,
	actual: string
): 'entrar' | 'salir' | 'nada' {
	const estaba = anterior !== null && esRutaSesion(anterior);
	const esta = esRutaSesion(actual);
	if (esta && !estaba) return 'entrar';
	if (!esta && estaba) return 'salir';
	return 'nada';
}

function esRutaSesion(ruta: string): boolean {
	return ruta === '/sesion' || ruta.startsWith('/sesion/');
}
