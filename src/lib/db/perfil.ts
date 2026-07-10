// Operaciones CRUD para el almacen perfil (singleton id=1).
import type { Perfil } from '$lib/motor/schema';
import { db } from './db';
import { crearError } from '$lib/errores/crear';

export async function obtenerPerfil(): Promise<Perfil | undefined> {
	try {
		return await db.perfil.get(1);
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener perfil', error);
	}
}

export async function guardarPerfil(perfil: Omit<Perfil, 'id'>): Promise<1> {
	try {
		return (await db.perfil.put({ ...perfil, id: 1 })) as 1;
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al guardar perfil', error);
	}
}

export async function actualizarPerfil(parche: Partial<Omit<Perfil, 'id'>>): Promise<number> {
	try {
		return await db.perfil.update(1, parche);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al actualizar perfil', error);
	}
}

// "Rehacer evaluacion" (Configuracion): borra SOLO el perfil. Historial,
// estados y dolor quedan (el usuario rehace su evaluacion, no su historia).
export async function borrarPerfil(): Promise<void> {
	try {
		await db.perfil.delete(1);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al borrar perfil', error);
	}
}

// "Restablecer todo / empezar de cero" (Configuracion): borra todas
// las tablas persistidas del usuario en una sola transaccion. La
// preferencia de sonido (localStorage) NO es dato del usuario y queda
// fuera: conserva su eleccion de audio tras un borrado.
export async function restablecerBase(): Promise<void> {
	try {
		await db.transaction(
			'rw',
			[db.perfil, db.estado_ejercicios, db.sesiones, db.historial_dolor, db.sesion_en_curso],
			async () => {
				await Promise.all([
					db.perfil.clear(),
					db.estado_ejercicios.clear(),
					db.sesiones.clear(),
					db.historial_dolor.clear(),
					db.sesion_en_curso.clear(),
				]);
			}
		);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al restablecer la base', error);
	}
}

export async function marcarPrimeraSesion(ahora: number): Promise<number> {
	try {
		return await db.perfil.update(1, { fecha_primera_sesion: ahora });
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al marcar primera sesion', error);
	}
}
