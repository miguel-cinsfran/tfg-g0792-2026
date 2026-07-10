// Elegir split y tipo de sesion del dia. Limites en rules.split.

import type { Nivel, SesionCompletada, Split, TipoSesion } from './schema.js';
import { rules } from './reglas.js';

export interface ResultadoSplit {
	split: Split;
	// true cuando el usuario pidio mas dias que el maximo recomendado y
	// se ajusto. La UI muestra el aviso; el motor solo informa.
	aviso_limite_dias: boolean;
}

export function elegirSplit(dias_semana: number, nivel_experiencia: Nivel): ResultadoSplit {
	const limites = rules.split;
	if (dias_semana > limites['RULE-SPLIT-MAX-DIAS-FB']) {
		// 6+ dias: PPL no esta en MVP; se ajusta al maximo con aviso.
		return { split: 'FULL_BODY', aviso_limite_dias: true };
	}
	if (dias_semana >= limites['RULE-SPLIT-MIN-DIAS-UL'] && nivel_experiencia !== 'principiante') {
		return { split: 'UPPER_LOWER', aviso_limite_dias: false };
	}
	return { split: 'FULL_BODY', aviso_limite_dias: false };
}

// `ultimaSesion` es null para la primera sesion del usuario.
export function determinarTipoSesion(
	split: Split,
	ultimaSesion: SesionCompletada | null,
): TipoSesion {
	if (split === 'FULL_BODY') return 'FULL_BODY';
	if (ultimaSesion === null) return 'UPPER';
	if (ultimaSesion.tipo === 'UPPER') return 'LOWER';
	// LOWER, o FULL_BODY si el usuario acaba de cambiar de split:
	// el ciclo upper/lower (re)arranca en UPPER.
	return 'UPPER';
}
