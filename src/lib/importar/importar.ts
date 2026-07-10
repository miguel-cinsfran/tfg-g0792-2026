// Importacion y exportacion de los cuatro almacenes. La importacion
// valida con Zod ANTES de escribir y reemplaza todo en una transaccion:
// o entra el archivo completo o no entra nada.

import { db } from '$lib/db/db';
import { crearError } from '$lib/errores/crear';
import { ExporteSchema, VERSION_EXPORTE, type Exporte } from './schema';

export function validarExporte(datos: unknown): Exporte {
	if (typeof datos !== 'object' || datos === null) {
		throw crearError('ERR-IMPORT-INVALID', 'El archivo no es un JSON de exportacion');
	}
	const version = (datos as { version?: unknown }).version;
	if (version !== VERSION_EXPORTE) {
		throw crearError('ERR-IMPORT-VERSION', `Version de exporte no soportada: ${String(version)}`);
	}
	const resultado = ExporteSchema.safeParse(datos);
	if (!resultado.success) {
		throw crearError('ERR-IMPORT-INVALID', 'El archivo no cumple el formato de exportacion', resultado.error);
	}
	return resultado.data;
}

export async function importarDatos(datos: unknown): Promise<void> {
	const exporte = validarExporte(datos);
	try {
		await db.transaction('rw', db.perfil, db.estado_ejercicios, db.sesiones, db.historial_dolor, async () => {
			await Promise.all([db.perfil.clear(), db.estado_ejercicios.clear(), db.sesiones.clear(), db.historial_dolor.clear()]);
			if (exporte.perfil !== null) await db.perfil.put(exporte.perfil);
			await db.estado_ejercicios.bulkPut(exporte.estado_ejercicios);
			await db.sesiones.bulkPut(exporte.sesiones);
			await db.historial_dolor.bulkPut(exporte.historial_dolor);
		});
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al escribir los datos importados', error);
	}
}

export async function exportarDatos(): Promise<Exporte> {
	try {
		const [perfil, estado_ejercicios, sesiones, historial_dolor] = await Promise.all([
			db.perfil.get(1),
			db.estado_ejercicios.toArray(),
			db.sesiones.toArray(),
			db.historial_dolor.toArray(),
		]);
		return { version: VERSION_EXPORTE, perfil: perfil ?? null, estado_ejercicios, sesiones, historial_dolor };
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al leer los datos para exportar', error);
	}
}
