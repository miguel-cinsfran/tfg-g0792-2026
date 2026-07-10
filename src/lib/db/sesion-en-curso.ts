// Respaldo persistente de la sesion en curso. Guardar es best-effort
// y NUNCA lanza: si falla, la sesion sigue en memoria. Leer si lanza
// (la pantalla decide que mostrar).

import type { SesionEnCurso } from '$lib/motor/schema';
import { db, type SesionEnCursoGuardada } from './db';
import { crearError } from '$lib/errores/crear';

// Un respaldo mas viejo que esto no se ofrece: el plan rotativo de
// splits ya quedo desfasado y retomar a mitad no tiene sentido.
const ANTIGUEDAD_MAXIMA_MS = 12 * 60 * 60 * 1000;

// `sesion` debe llegar plana (sin proxies de Svelte 5): el caller hace
// $state.snapshot antes (leccion DataCloneError).
export async function guardarSesionEnCurso(sesion: SesionEnCurso, ahora: number): Promise<void> {
	try {
		await db.sesion_en_curso.put({ id: 1, sesion, guardada_en: ahora });
	} catch {
		// respaldo best-effort, la sesion en memoria manda
	}
}

export async function obtenerSesionEnCurso(ahora: number): Promise<SesionEnCursoGuardada | null> {
	let guardada: SesionEnCursoGuardada | undefined;
	try {
		guardada = await db.sesion_en_curso.get(1);
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al leer la sesión en curso guardada', error);
	}
	if (!guardada) return null;
	if (ahora - guardada.guardada_en > ANTIGUEDAD_MAXIMA_MS) {
		await borrarSesionEnCurso();
		return null;
	}
	return guardada;
}

export async function borrarSesionEnCurso(): Promise<void> {
	try {
		await db.sesion_en_curso.delete(1);
	} catch {
		// peor caso: ofrecer reanudar de mas una vez
	}
}
