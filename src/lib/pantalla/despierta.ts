// Mantener la pantalla encendida mientras se usa la app. Preferencia
// de dispositivo en localStorage (misma excepcion que el audio: debe
// sobrevivir a "borrar todo"). El plugin puede no estar disponible
// (web, WebView vieja): todas las llamadas son best-effort y nunca
// lanzan; si fallan, la preferencia queda guardada para el proximo
// arranque.

import { KeepAwake } from '@capacitor-community/keep-awake';

const CLAVE_AJUSTE = 'pantalla-encendida';

export function pantallaEncendidaActivada(): boolean {
	try {
		// Apagada por defecto: gastar bateria es opt-in.
		return localStorage.getItem(CLAVE_AJUSTE) === '1';
	} catch {
		return false;
	}
}

export async function establecerPantallaEncendida(activada: boolean): Promise<void> {
	try {
		localStorage.setItem(CLAVE_AJUSTE, activada ? '1' : '0');
	} catch {
		// Sin persistencia: aplica igual para esta corrida.
	}
	await aplicar(activada);
}

async function aplicar(activada: boolean): Promise<void> {
	try {
		if (activada) {
			await KeepAwake.keepAwake();
		} else {
			await KeepAwake.allowSleep();
		}
	} catch {
		// No soportado: no hay nada que hacer.
	}
}

/** Re-aplica la preferencia guardada. Llamar una vez al arrancar. */
export async function aplicarPreferenciaPantalla(): Promise<void> {
	if (pantallaEncendidaActivada()) {
		await aplicar(true);
	}
}
