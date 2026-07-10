// Consultas de solo lectura para el almacen historial_dolor.
import type { RegistroDolor } from '$lib/motor/schema';
import { db } from './db';
import { crearError } from '$lib/errores/crear';

export async function obtenerHistorialDolor(ejercicio_id?: string): Promise<RegistroDolor[]> {
	try {
		if (ejercicio_id !== undefined) {
			return await db.historial_dolor.where('ejercicio_id').equals(ejercicio_id).reverse().sortBy('fecha');
		}
		return await db.historial_dolor.orderBy('fecha').reverse().toArray();
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener historial de dolor', error);
	}
}