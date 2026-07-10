// Almacenamiento privado del catalogo validado. Solo cargar.ts y
// consultas.ts importan este modulo.

import type { EjercicioValidado } from './schema';

let _catalogo: EjercicioValidado[] = [];

export function obtenerCatalogo(): readonly EjercicioValidado[] {
	return _catalogo;
}
export function establecerCatalogo(ejercicios: EjercicioValidado[]): void {
	_catalogo = ejercicios;
}