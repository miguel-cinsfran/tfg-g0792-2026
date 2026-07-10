// Progreso de la semana en curso. Pura: no toca Dexie, DOM ni red.
// Cuenta dias DISTINTOS con sesion (no cancelada por dolor), misma
// semantica que la racha. Devuelve `meta` para que la UI muestre "X de N"
// sin recalcular.

import { inicioSemana } from '$lib/motor/racha';
import type { SesionCompletada } from '$lib/motor/schema';

export interface ProgresoSemanal {
	hechas: number;
	meta: number;
}

// Mismo criterio que inicioSemana. Copiado aca: el helper no se exporta
// del motor y la duplicacion es trivial.
function claveDia(ts: number): number {
	const fecha = new Date(ts);
	return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/** Cuenta dias distintos con sesion (no cancelada por dolor) en la semana de `ahora`. */
export function contarProgresoSemana(
	sesiones: SesionCompletada[],
	dias_semana: number,
	ahora: number,
): ProgresoSemanal {
	const semanaActual = inicioSemana(ahora);
	const dias = new Set<number>();
	for (const sesion of sesiones) {
		if (sesion.cancelada_por_dolor) continue;
		if (inicioSemana(sesion.fecha) !== semanaActual) continue;
		dias.add(claveDia(sesion.fecha));
	}
	return { hechas: dias.size, meta: dias_semana };
}
