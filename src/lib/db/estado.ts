// Consultas y actualizaciones para el almacen estado_ejercicios.
import type { EstadoEjercicio, Zona } from '$lib/motor/schema';
import { db, generarId } from './db';
import { crearError } from '$lib/errores/crear';
import { rules } from '$lib/motor/reglas';
import { reactivarEjercicio } from '$lib/motor/dolor';
import { obtenerEjercicio } from '$lib/catalogo/consultas';

const DIA_MS = 86_400_000;

export async function obtenerEstadosTodos(): Promise<EstadoEjercicio[]> {
	try {
		return await db.estado_ejercicios.toArray();
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener estados', error);
	}
}

export async function obtenerEstado(ejercicio_id: string): Promise<EstadoEjercicio | undefined> {
	try {
		return await db.estado_ejercicios.get(ejercicio_id);
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener estado', error);
	}
}

export async function obtenerEstadosBloqueados(): Promise<EstadoEjercicio[]> {
	try {
		return await db.estado_ejercicios.filter((e) => e.bloqueado).toArray();
	} catch (error) {
		throw crearError('ERR-DB-READ', 'Error al obtener estados bloqueados', error);
	}
}

export async function actualizarFechaUltimoUso(ejercicio_id: string, ahora: number): Promise<number> {
	try {
		return await db.estado_ejercicios.update(ejercicio_id, { fecha_ultimo_uso: ahora });
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al actualizar fecha ultimo uso', error);
	}
}

// Persiste el estado de la variante destino al confirmar una
// progresion/regresion manual. El origen no se toca (ambos en el pool).
export async function guardarEstado(estado: EstadoEjercicio): Promise<void> {
	try {
		await db.estado_ejercicios.put(estado);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al guardar estado de ejercicio', error);
	}
}

// Transaccion atomica: bloquea ejercicio y registra dolor. El upsert
// cubre el caso de dolor en un ejercicio sin fila previa (un update()
// de Dexie seria no-op silencioso y el bloqueo se perderia).
export async function bloquearEjercicio(ejercicio_id: string, zonas: Zona[], ahora: number): Promise<void> {
	try {
		await db.transaction('rw', db.estado_ejercicios, db.historial_dolor, async () => {
			const fila = await db.estado_ejercicios.get(ejercicio_id);
			const bloqueo = {
				bloqueado: true,
				razon_bloqueo: 'Dolor en ' + zonas.join(', '),
				fecha_bloqueo: ahora,
				fecha_revision: ahora + rules.dolor['RULE-DOLOR-BLOQUEO-DIAS'] * DIA_MS,
			};
			if (fila) {
				await db.estado_ejercicios.put({ ...fila, ...bloqueo });
			} else {
				// Primer contacto: la fila nace bloqueada. Fallback 0 solo
				// ocurre en tests sin catalogo cargado.
				await db.estado_ejercicios.put({
					ejercicio_id,
					series_objetivo: 3,
					reps_objetivo: obtenerEjercicio(ejercicio_id)?.reps_iniciales ?? 0,
					fecha_ultimo_uso: null,
					...bloqueo,
				});
			}
			await db.historial_dolor.add({
				id: generarId(),
				ejercicio_id,
				zonas,
				fecha: ahora,
				estado: 'bloqueado',
			});
		});
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al bloquear ejercicio', error);
	}
}

// Reprograma la fecha_revision sin tocar historial_dolor (single-table).
export async function reprogramarRevision(ejercicio_id: string, ahora: number): Promise<void> {
	try {
		await db.estado_ejercicios.update(ejercicio_id, {
			fecha_revision: ahora + rules.dolor['RULE-DOLOR-BLOQUEO-DIAS'] * DIA_MS,
		});
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al reprogramar revision', error);
	}
}

// Transaccion atomica: desbloquea y registra resolucion. La pura
// `reactivarEjercicio` del motor calcula los campos de reintroduccion;
// la db solo lee, aplica con `ahora` para `fecha_revision` y persiste.
// La fecha se sobreescribe aca (la pura la pone en null) para que la
// pantalla muestre cuando se resolvio el bloqueo.
export async function marcarResuelto(ejercicio_id: string, ahora: number): Promise<void> {
	try {
		await db.transaction('rw', db.estado_ejercicios, db.historial_dolor, async () => {
			const fila = await db.estado_ejercicios.get(ejercicio_id);
			if (fila) {
				const reactivado = reactivarEjercicio(fila);
				await db.estado_ejercicios.put({
					...reactivado,
					fecha_revision: ahora,
				});
			}
			await db.historial_dolor.add({
				id: generarId(),
				ejercicio_id,
				zonas: [],
				fecha: ahora,
				estado: 'resuelto',
			});
		});
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al marcar resuelto', error);
	}
}
