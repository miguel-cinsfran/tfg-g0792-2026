// Consultas de solo lectura para el almacen sesiones.
import type { SesionCompletada, EstadoEjercicio } from '$lib/motor/schema';
import { db } from './db';
import { crearError } from '$lib/errores/crear';

export async function obtenerHistorial(limite?: number): Promise<SesionCompletada[]> {
	if (limite !== undefined && limite <= 0) return [];
	try {
		let query = db.sesiones.orderBy('fecha').reverse();
		if (limite !== undefined) query = query.limit(limite);
		return await query.toArray();
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener historial de sesiones', error);
	}
}

export async function obtenerUltimaSesion(): Promise<SesionCompletada | undefined> {
	try {
		return await db.sesiones.orderBy('fecha').reverse().first();
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener última sesión', error);
	}
}

// Cierre atomico de sesion: escribe la sesion, actualiza estados y
// (si es la primera vez) marca fecha_primera_sesion.
export async function cerrarSesion(
	sesion: SesionCompletada,
	estadosActualizados: EstadoEjercicio[],
	ahora: number
): Promise<void> {
	try {
		await db.transaction(
			'rw',
			db.sesiones,
			db.estado_ejercicios,
			db.perfil,
			db.sesion_en_curso,
			async () => {
				await db.sesiones.add(sesion);
				for (const estado of estadosActualizados) {
					await db.estado_ejercicios.put(estado);
				}
				const perfil = await db.perfil.get(1);
				if (perfil && perfil.fecha_primera_sesion === null) {
					await db.perfil.update(1, { fecha_primera_sesion: ahora });
				}
				// El respaldo de reanudacion muere con el cierre: si quedara,
				// la proxima visita ofreceria retomar una sesion ya cerrada.
				await db.sesion_en_curso.delete(1);
			}
		);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al cerrar sesion', error);
	}
}