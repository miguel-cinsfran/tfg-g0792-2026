import { obtenerCatalogo } from './estado';
import type { EjercicioValidado } from './schema';
import type { Zona } from '$lib/motor/schema';

export function obtenerEjercicio(id: string): EjercicioValidado | undefined {
	return obtenerCatalogo().find((e) => e.id === id);
}

export function obtenerCatalogoPorPatron(
	patron: EjercicioValidado['patron'],
	subpatron?: EjercicioValidado['subpatron'],
): readonly EjercicioValidado[] {
	return obtenerCatalogo().filter((e) => {
		if (e.patron !== patron) return false;
		if (subpatron !== undefined && e.subpatron !== subpatron) return false;
		return true;
	});
}

export function obtenerSustituto(
	ejercicio: EjercicioValidado,
	zona: Zona,
): readonly EjercicioValidado[] {
	return obtenerCatalogo().filter((e) => {
		if (e.id === ejercicio.id) return false;
		if (e.patron !== ejercicio.patron) return false;
		if (ejercicio.subpatron !== undefined) {
			if (e.subpatron !== ejercicio.subpatron) return false;
		} else if (e.subpatron !== undefined) {
			return false;
		}
		if (e.zonas_involucradas.includes(zona)) return false;
		return true;
	});
}