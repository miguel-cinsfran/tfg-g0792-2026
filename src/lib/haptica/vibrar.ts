// Triple fallback: Capacitor Haptics (APK) -> navigator.vibrate (navegador)
// -> no-op. Duraciones desde rules.haptica. Nunca lanza.

import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { rules } from '$lib/motor/reglas';

type TipoVibracion = 'inicio' | 'fin' | 'descanso-aviso' | 'descanso-fin';

const DURACIONES: Record<TipoVibracion, keyof typeof rules.haptica> = {
	inicio: 'RULE-HAP-INICIO-MS',
	fin: 'RULE-HAP-FIN-MS',
	'descanso-aviso': 'RULE-HAP-DESCANSO-AVISO-MS',
	'descanso-fin': 'RULE-HAP-DESCANSO-FIN-MS',
};

// El aviso a 3 segundos es el pulso corto repetido 3 veces; el resto
// son pulsos unicos.
const REPETICIONES: Record<TipoVibracion, number> = {
	inicio: 1,
	fin: 1,
	'descanso-aviso': 3,
	'descanso-fin': 1,
};

const PAUSA_ENTRE_PULSOS_MS = 100;

export function vibrar(tipo: TipoVibracion): void {
	const ms = rules.haptica[DURACIONES[tipo]];
	const repeticiones = REPETICIONES[tipo];

	if (Capacitor.isNativePlatform()) {
		for (let i = 0; i < repeticiones; i++) {
			setTimeout(() => {
				Haptics.vibrate({ duration: ms }).catch(() => {
					// no-op intencional
				});
			}, i * (ms + PAUSA_ENTRE_PULSOS_MS));
		}
		return;
	}

	if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
		return;
	}
	const patron: number[] = [];
	for (let i = 0; i < repeticiones; i++) {
		if (i > 0) patron.push(PAUSA_ENTRE_PULSOS_MS);
		patron.push(ms);
	}
	try {
		navigator.vibrate(patron.length === 1 ? ms : patron);
	} catch {
		// no-op intencional: permisos denegados o API no disponible
	}
}
