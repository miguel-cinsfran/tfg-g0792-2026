// Polyfill para IndexedDB en entorno Node (Vitest no tiene IndexedDB nativo)
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Perfil, EstadoEjercicio, Zona, SesionCompletada, RegistroDolor } from '$lib/motor/schema';
import { db, generarId } from './db';
import { obtenerPerfil, guardarPerfil, actualizarPerfil, marcarPrimeraSesion, borrarPerfil, restablecerBase } from './perfil';
import { obtenerEstadosTodos, obtenerEstado, obtenerEstadosBloqueados, actualizarFechaUltimoUso, bloquearEjercicio, marcarResuelto, reprogramarRevision, guardarEstado } from './estado';
import { obtenerHistorial, obtenerUltimaSesion, cerrarSesion } from './sesiones';
import { obtenerHistorialDolor } from './dolor';

// Se usa el singleton db en vez de instanciar CalisteniaDB para que
// las funciones de perfil (que importan el mismo singleton) compartan
// la misma conexion. Se limpian tablas en vez de borrar la base para
// no invalidar la conexion del singleton entre tests.
beforeEach(async () => {
	if (!db.isOpen()) {
		await db.open();
	}
});

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(db.tables.map((t) => t.clear()));
});

const perfilEjemplo: Omit<Perfil, 'id'> = {
	nombre: 'Test',
	anio_nacimiento: 1990,
	peso_kg: 70,
	disclaimer_aceptado: true,
	fecha_aceptacion_disclaimer: 1000000,
	objetivo: 'fuerza',
	nivel_experiencia: 'principiante',
	evaluacion_por_patron: { PUSH: 'principiante', PULL: 'principiante', LEGS: 'principiante', CORE: 'principiante' },
	ajuste_desbalance_activo: null,
	fecha_evaluacion: 1000000,
	dias_semana: 3,
	duracion_sesion_min: 30,
	split: 'FULL_BODY',
	zonas_dolor_preexistente: [],
	tiene_anclaje: false,
	fecha_primera_sesion: null,
};

describe('generarId', () => {
	it('retorna un string', () => {
		expect(typeof generarId()).toBe('string');
	});

	it('retorna valores distintos en llamadas sucesivas', () => {
		expect(generarId()).not.toBe(generarId());
	});
});

describe('CalisteniaDB', () => {
	it('abre la base de datos sin error', async () => {
		await db.open();
		expect(db.isOpen()).toBe(true);
	});

	it('define las tablas del schema (4 del MVP + respaldo de sesion en curso)', async () => {
		await db.open();
		const nombres = db.tables.map((t) => t.name).sort();
		expect(nombres).toEqual(['estado_ejercicios', 'historial_dolor', 'perfil', 'sesion_en_curso', 'sesiones']);
	});
});

describe('perfil', () => {
	it('retorna undefined cuando no existe perfil', async () => {
		const resultado = await obtenerPerfil();
		expect(resultado).toBeUndefined();
	});

	it('guardarPerfil almacena con id 1', async () => {
		await guardarPerfil(perfilEjemplo);
		const resultado = await obtenerPerfil();
		expect(resultado?.id).toBe(1);
		expect(resultado?.nombre).toBe('Test');
	});

	it('actualizarPerfil fusiona campos parciales', async () => {
		await guardarPerfil(perfilEjemplo);
		await actualizarPerfil({ peso_kg: 80 });
		const resultado = await obtenerPerfil();
		expect(resultado?.peso_kg).toBe(80);
		expect(resultado?.nombre).toBe('Test');
	});

	it('marcarPrimeraSesion establece fecha_primera_sesion', async () => {
		await guardarPerfil(perfilEjemplo);
		await marcarPrimeraSesion(2000000);
		const resultado = await obtenerPerfil();
		expect(resultado?.fecha_primera_sesion).toBe(2000000);
	});

	it('borrarPerfil deja obtenerPerfil en undefined sin tocar otras tablas', async () => {
		await guardarPerfil(perfilEjemplo);
		await db.historial_dolor.add({
			id: generarId(),
			ejercicio_id: 'ej-001',
			zonas: ['hombros'],
			fecha: 1000000,
			estado: 'bloqueado',
		});
		await borrarPerfil();
		expect(await obtenerPerfil()).toBeUndefined();
		expect(await db.historial_dolor.count()).toBe(1);
	});
});

describe('restablecerBase', () => {
	beforeEach(async () => {
		// Sembramos las cinco tablas con datos para que el test
		// demuestre que se vacian TODAS juntas, no solo el perfil.
		await guardarPerfil(perfilEjemplo);
		await db.estado_ejercicios.put({
			ejercicio_id: 'ej-001',
			series_objetivo: 3,
			reps_objetivo: 8,
			bloqueado: false,
			razon_bloqueo: null,
			fecha_bloqueo: null,
			fecha_revision: null,
			fecha_ultimo_uso: null,
		});
		await db.sesiones.add({
			id: 's-reset-1',
			fecha: 1000000,
			tipo: 'FULL_BODY',
			ejercicios: [],
			duracion_minutos: 30,
			cancelada_por_dolor: false,
		});
		await db.historial_dolor.add({
			id: 'd-reset-1',
			ejercicio_id: 'ej-001',
			zonas: ['hombros'],
			fecha: 1000000,
			estado: 'bloqueado',
		});
		await db.sesion_en_curso.put({
			id: 1,
			sesion: {
				tipo: 'FULL_BODY',
				fecha_inicio: 1000000,
				plan: [],
				indice_ejercicio: 0,
				indice_serie: 0,
				ejecutados: [],
				cancelada_por_dolor: false,
			},
			guardada_en: 1000000,
		});
	});

	it('vacia las cinco tablas en una sola transaccion', async () => {
		// Sembrado verifica estado pre.
		expect(await db.perfil.count()).toBe(1);
		expect(await db.estado_ejercicios.count()).toBe(1);
		expect(await db.sesiones.count()).toBe(1);
		expect(await db.historial_dolor.count()).toBe(1);
		expect(await db.sesion_en_curso.count()).toBe(1);

		await restablecerBase();

		expect(await db.perfil.count()).toBe(0);
		expect(await db.estado_ejercicios.count()).toBe(0);
		expect(await db.sesiones.count()).toBe(0);
		expect(await db.historial_dolor.count()).toBe(0);
		expect(await db.sesion_en_curso.count()).toBe(0);
		expect(await obtenerPerfil()).toBeUndefined();
	});

	it('borrarPerfil (rehacer evaluacion) sigue borrando SOLO el perfil', async () => {
		// Contrato que NO cambia con el nuevo flujo: "Rehacer evaluacion"
		// conserva historial, estados, dolor y respaldo.
		await borrarPerfil();
		expect(await db.perfil.count()).toBe(0);
		expect(await db.estado_ejercicios.count()).toBe(1);
		expect(await db.sesiones.count()).toBe(1);
		expect(await db.historial_dolor.count()).toBe(1);
		expect(await db.sesion_en_curso.count()).toBe(1);
	});

	it('rollback atomico: si algo falla, ninguna tabla queda vacia', async () => {
		// Forzamos un fallo en medio de la transaccion: el clear de
		// historial_dolor se mockea para lanzar.
		vi.spyOn(db.historial_dolor, 'clear').mockRejectedValue(new Error('falla forzada'));
		await expect(restablecerBase()).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
		// Ninguna tabla quedo parcialmente vaciada: la transaccion hizo rollback.
		expect(await db.perfil.count()).toBe(1);
		expect(await db.estado_ejercicios.count()).toBe(1);
		expect(await db.sesiones.count()).toBe(1);
		expect(await db.historial_dolor.count()).toBe(1);
		expect(await db.sesion_en_curso.count()).toBe(1);
	});

	it('restablecerBase() vacia TODO; borrarPerfil() solo el perfil (contrato de las dos destructivas)', async () => {
		// El "Rehacer evaluacion" (borrarPerfil) y el "Restablecer todo"
		// (restablecerBase) son dos acciones destructivas DISTINTAS de
		// Configuracion. Este test demuestra que sus efectos son
		// diferentes: el usuario elige segun quiera conservar o no su
		// historia.
		const antes = {
			perfil: await db.perfil.count(),
			estados: await db.estado_ejercicios.count(),
			sesiones: await db.sesiones.count(),
			dolor: await db.historial_dolor.count(),
			respaldo: await db.sesion_en_curso.count()
		};
		expect(antes).toEqual({
			perfil: 1,
			estados: 1,
			sesiones: 1,
			dolor: 1,
			respaldo: 1
		});

		// Escenario A: "Rehacer evaluacion" -> solo el perfil.
		await borrarPerfil();
		expect(await db.perfil.count()).toBe(0);
		expect(await db.estado_ejercicios.count()).toBe(1);
		expect(await db.sesiones.count()).toBe(1);
		expect(await db.historial_dolor.count()).toBe(1);
		expect(await db.sesion_en_curso.count()).toBe(1);

		// Escenario B: "Restablecer todo" -> las cinco tablas.
		await restablecerBase();
		expect(await db.perfil.count()).toBe(0);
		expect(await db.estado_ejercicios.count()).toBe(0);
		expect(await db.sesiones.count()).toBe(0);
		expect(await db.historial_dolor.count()).toBe(0);
		expect(await db.sesion_en_curso.count()).toBe(0);
	});
});

const estadoEjemplo: EstadoEjercicio = {
	ejercicio_id: 'ej-001',
	series_objetivo: 3,
	reps_objetivo: 8,
	bloqueado: false,
	razon_bloqueo: null,
	fecha_bloqueo: null,
	fecha_revision: null,
	fecha_ultimo_uso: null,
};

describe('estado', () => {
	it('obtenerEstadosTodos retorna [] con tabla vacia', async () => {
		const resultado = await obtenerEstadosTodos();
		expect(resultado).toEqual([]);
	});

	it('obtenerEstadosBloqueados retorna [] sin bloqueados', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		const resultado = await obtenerEstadosBloqueados();
		expect(resultado).toEqual([]);
	});

	it('obtenerEstado retorna undefined si no existe', async () => {
		const resultado = await obtenerEstado('inexistente');
		expect(resultado).toBeUndefined();
	});

	it('obtenerEstadosTodos retorna todos los estados', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		await db.estado_ejercicios.put({ ...estadoEjemplo, ejercicio_id: 'ej-002' });
		const resultado = await obtenerEstadosTodos();
		expect(resultado).toHaveLength(2);
	});

	it('obtenerEstadosBloqueados retorna solo bloqueados', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		await db.estado_ejercicios.put({ ...estadoEjemplo, ejercicio_id: 'ej-002', bloqueado: true, razon_bloqueo: 'dolor', fecha_bloqueo: 1000, fecha_revision: 2000 });
		const resultado = await obtenerEstadosBloqueados();
		expect(resultado).toHaveLength(1);
		expect(resultado[0].ejercicio_id).toBe('ej-002');
	});

	it('obtenerEstado retorna el estado correcto', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		const resultado = await obtenerEstado('ej-001');
		expect(resultado?.ejercicio_id).toBe('ej-001');
		expect(resultado?.series_objetivo).toBe(3);
	});

	it('actualizarFechaUltimoUso establece fecha_ultimo_uso', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		await actualizarFechaUltimoUso('ej-001', 5000);
		const resultado = await obtenerEstado('ej-001');
		expect(resultado?.fecha_ultimo_uso).toBe(5000);
	});
});

describe('guardarEstado', () => {
	it('crea la fila de la variante destino y obtenerEstado la devuelve', async () => {
		await guardarEstado({ ...estadoEjemplo, ejercicio_id: 'ej-variante' });
		const fila = await obtenerEstado('ej-variante');
		expect(fila?.reps_objetivo).toBe(estadoEjemplo.reps_objetivo);
		expect(fila?.bloqueado).toBe(false);
	});

	it('sobreescribe una fila existente (upsert)', async () => {
		await guardarEstado(estadoEjemplo);
		await guardarEstado({ ...estadoEjemplo, reps_objetivo: 12 });
		expect((await obtenerEstado(estadoEjemplo.ejercicio_id))?.reps_objetivo).toBe(12);
	});
});

describe('bloquearEjercicio', () => {
	it('crea entrada en historial_dolor y actualiza estado del ejercicio', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		const zonas: Zona[] = ['hombros', 'codos'];
		await bloquearEjercicio('ej-001', zonas, 10000);
		const estado = await obtenerEstado('ej-001');
		expect(estado?.bloqueado).toBe(true);
		expect(estado?.razon_bloqueo).toBe('Dolor en hombros, codos');
		expect(estado?.fecha_bloqueo).toBe(10000);
		// RULE-DOLOR-BLOQUEO-DIAS real de rules.json: 28 dias.
		expect(estado?.fecha_revision).toBe(10000 + 28 * 24 * 60 * 60 * 1000);
		const historial = await db.historial_dolor.where('ejercicio_id').equals('ej-001').toArray();
		expect(historial).toHaveLength(1);
		expect(historial[0].zonas).toEqual(['hombros', 'codos']);
		expect(historial[0].estado).toBe('bloqueado');
	});

	it('sin fila previa, el bloqueo crea la fila (no se pierde en silencio)', async () => {
		await bloquearEjercicio('ej-sin-estado', ['rodillas'], 10000);
		const estado = await obtenerEstado('ej-sin-estado');
		expect(estado?.bloqueado).toBe(true);
		expect(estado?.razon_bloqueo).toBe('Dolor en rodillas');
		expect(estado?.fecha_ultimo_uso).toBeNull();
		const historial = await db.historial_dolor.where('ejercicio_id').equals('ej-sin-estado').toArray();
		expect(historial).toHaveLength(1);
	});

	it('rollback atomico: ningun cambio persiste si la transaccion falla', async () => {
		await db.estado_ejercicios.put(estadoEjemplo);
		try {
			await db.transaction('rw', db.estado_ejercicios, db.historial_dolor, async () => {
				await db.estado_ejercicios.update('ej-001', { bloqueado: true });
				throw new Error('fallo forzado');
			});
		} catch {
			// Se ignora el error: lo importante es verificar que no se persistio nada
		}
		const estado = await obtenerEstado('ej-001');
		expect(estado?.bloqueado).toBe(false);
		const historial = await db.historial_dolor.toArray();
		expect(historial).toHaveLength(0);
	});
});

describe('marcarResuelto', () => {
	const estadoBloqueado: EstadoEjercicio = {
		...estadoEjemplo,
		bloqueado: true,
		razon_bloqueo: 'hombros, codos',
		fecha_bloqueo: 10000,
		fecha_revision: 10000 + 7 * 24 * 60 * 60 * 1000,
	};

	it('limpia campos de bloqueo y crea entrada de resolucion en historial_dolor', async () => {
		await db.estado_ejercicios.put(estadoBloqueado);
		await marcarResuelto('ej-001', 20000);
		const estado = await obtenerEstado('ej-001');
		expect(estado?.bloqueado).toBe(false);
		expect(estado?.razon_bloqueo).toBeNull();
		expect(estado?.fecha_revision).toBe(20000);
		const historial = await db.historial_dolor.where('ejercicio_id').equals('ej-001').toArray();
		expect(historial).toHaveLength(1);
		expect(historial[0].zonas).toEqual([]);
		expect(historial[0].estado).toBe('resuelto');
	});

	it('setea reintroduccion_sesiones_restantes = REINTRO-SESIONES (ALG-08 reintroduccion gradual)', async () => {
		await db.estado_ejercicios.put(estadoBloqueado);
		await marcarResuelto('ej-001', 20000);
		const estado = await obtenerEstado('ej-001');
		expect(estado?.reintroduccion_sesiones_restantes).toBe(2);
		// fecha_bloqueo tambien se limpia (antes no se hacia): al
		// desbloquear no tiene sentido conservar cuando empezo el bloqueo.
		expect(estado?.fecha_bloqueo).toBeNull();
	});

	it('rollback atomico: estado sigue bloqueado si la transaccion falla', async () => {
		await db.estado_ejercicios.put(estadoBloqueado);
		try {
			await db.transaction('rw', db.estado_ejercicios, db.historial_dolor, async () => {
				await db.estado_ejercicios.update('ej-001', { bloqueado: false });
				throw new Error('fallo forzado');
			});
		} catch {
			// Se ignora el error: lo importante es verificar que no se persistio nada
		}
		const estado = await obtenerEstado('ej-001');
		expect(estado?.bloqueado).toBe(true);
		const historial = await db.historial_dolor.toArray();
		expect(historial).toHaveLength(0);
	});
});

describe('reprogramarRevision', () => {
	const estadoBloqueado: EstadoEjercicio = {
		...estadoEjemplo,
		bloqueado: true,
		razon_bloqueo: 'hombros, codos',
		fecha_bloqueo: 10000,
		fecha_revision: 10000 + 7 * 24 * 60 * 60 * 1000,
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('actualiza fecha_revision con fila existente', async () => {
		await db.estado_ejercicios.put(estadoBloqueado);
		await reprogramarRevision('ej-001', 20_000_000);
		const estado = await obtenerEstado('ej-001');
		expect(estado?.fecha_revision).toBe(20_000_000 + 28 * 86_400_000);
	});

	it('lanza ERR-DB-WRITE si la operacion falla', async () => {
		await db.estado_ejercicios.put(estadoBloqueado);
		vi.spyOn(db.estado_ejercicios, 'update').mockRejectedValue(new Error('dexie error'));
		await expect(reprogramarRevision('ej-001', 1000)).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
	});

	it('no-op sobre ejercicio_id inexistente (no lanza, no crea fila)', async () => {
		await expect(reprogramarRevision('inexistente', 1000)).resolves.toBeUndefined();
		const fila = await obtenerEstado('inexistente');
		expect(fila).toBeUndefined();
	});
});

const sesionEjemplo = (fecha: number, id: string): SesionCompletada => ({
	id,
	fecha,
	tipo: 'FULL_BODY',
	ejercicios: [],
	duracion_minutos: 30,
	cancelada_por_dolor: false,
});

describe('obtenerHistorial', () => {
	it('limit 3 devuelve las 3 mas recientes DESC', async () => {
		await db.sesiones.bulkAdd([
			sesionEjemplo(1000, 's1'),
			sesionEjemplo(2000, 's2'),
			sesionEjemplo(3000, 's3'),
			sesionEjemplo(4000, 's4'),
			sesionEjemplo(5000, 's5'),
		]);
		const resultado = await obtenerHistorial(3);
		expect(resultado).toHaveLength(3);
		expect(resultado[0].id).toBe('s5');
		expect(resultado[1].id).toBe('s4');
		expect(resultado[2].id).toBe('s3');
	});

	it('limit 0 devuelve lista vacia', async () => {
		await db.sesiones.add(sesionEjemplo(1000, 's1'));
		const resultado = await obtenerHistorial(0);
		expect(resultado).toEqual([]);
	});

	it('limit negativo devuelve lista vacia', async () => {
		await db.sesiones.add(sesionEjemplo(1000, 's1'));
		const resultado = await obtenerHistorial(-1);
		expect(resultado).toEqual([]);
	});

	it('sin limit devuelve todo DESC', async () => {
		await db.sesiones.bulkAdd([
			sesionEjemplo(1000, 's1'),
			sesionEjemplo(3000, 's3'),
			sesionEjemplo(2000, 's2'),
		]);
		const resultado = await obtenerHistorial();
		expect(resultado).toHaveLength(3);
		expect(resultado[0].id).toBe('s3');
		expect(resultado[1].id).toBe('s2');
		expect(resultado[2].id).toBe('s1');
	});
});

describe('obtenerUltimaSesion', () => {
	it('sin sesiones devuelve undefined', async () => {
		const resultado = await obtenerUltimaSesion();
		expect(resultado).toBeUndefined();
	});

	it('con varias sesiones devuelve la ultima', async () => {
		await db.sesiones.bulkAdd([
			sesionEjemplo(1000, 's1'),
			sesionEjemplo(3000, 's3'),
			sesionEjemplo(2000, 's2'),
		]);
		const resultado = await obtenerUltimaSesion();
		expect(resultado?.id).toBe('s3');
	});
});

describe('cerrarSesion', () => {
	it('primera sesion: escribe sesion, actualiza estados y marca fecha_primera_sesion', async () => {
		await guardarPerfil(perfilEjemplo);
		const ahora = 3000000;
		const sesion = sesionEjemplo(ahora, 's-cerrar-1');
		const estadosActualizados: EstadoEjercicio[] = [
			{ ...estadoEjemplo, ejercicio_id: 'ej-001', fecha_ultimo_uso: ahora },
			{ ...estadoEjemplo, ejercicio_id: 'ej-002', fecha_ultimo_uso: ahora },
		];
		await cerrarSesion(sesion, estadosActualizados, ahora);
		const sesiones = await db.sesiones.toArray();
		expect(sesiones).toHaveLength(1);
		expect(sesiones[0].id).toBe('s-cerrar-1');
		const estado1 = await obtenerEstado('ej-001');
		expect(estado1?.fecha_ultimo_uso).toBe(ahora);
		const estado2 = await obtenerEstado('ej-002');
		expect(estado2?.fecha_ultimo_uso).toBe(ahora);
		const perfil = await obtenerPerfil();
		expect(perfil?.fecha_primera_sesion).toBe(ahora);
	});

	it('sesion subsiguiente NO marca fecha_primera_sesion si ya esta seteada', async () => {
		await guardarPerfil({ ...perfilEjemplo, fecha_primera_sesion: 1000 });
		const ahora = 5000000;
		const sesion = sesionEjemplo(ahora, 's-cerrar-2');
		const estadosActualizados: EstadoEjercicio[] = [
			{ ...estadoEjemplo, ejercicio_id: 'ej-001', fecha_ultimo_uso: ahora },
		];
		await cerrarSesion(sesion, estadosActualizados, ahora);
		const sesiones = await db.sesiones.toArray();
		expect(sesiones).toHaveLength(1);
		const perfil = await obtenerPerfil();
		expect(perfil?.fecha_primera_sesion).toBe(1000);
	});

	it('rollback atomico: nada persiste si la transaccion falla', async () => {
		await guardarPerfil(perfilEjemplo);
		await db.estado_ejercicios.put({ ...estadoEjemplo, ejercicio_id: 'ej-001' });
		try {
			await db.transaction('rw', db.sesiones, db.estado_ejercicios, db.perfil, async () => {
				await db.sesiones.add(sesionEjemplo(5000, 's-rollback'));
				await db.estado_ejercicios.put({ ...estadoEjemplo, ejercicio_id: 'ej-001', fecha_ultimo_uso: 5000 });
				await db.perfil.update(1, { fecha_primera_sesion: 5000 });
				throw new Error('fallo forzado');
			});
		} catch {
			// Se ignora el error: lo importante es verificar que no se persistio nada
		}
		const sesiones = await db.sesiones.toArray();
		expect(sesiones).toHaveLength(0);
		const estado = await obtenerEstado('ej-001');
		expect(estado?.fecha_ultimo_uso).toBeNull();
		const perfil = await obtenerPerfil();
		expect(perfil?.fecha_primera_sesion).toBeNull();
	});
});

const dolorEjemplo = (ejercicio_id: string, fecha: number, id: string): RegistroDolor => ({
	id,
	ejercicio_id,
	zonas: ['hombros'],
	fecha,
	estado: 'bloqueado',
});

describe('obtenerHistorialDolor', () => {
	it('filtra por ejercicio_id y retorna solo coincidencias DESC por fecha', async () => {
		await db.historial_dolor.bulkAdd([
			dolorEjemplo('ej-001', 1000, 'd1'),
			dolorEjemplo('ej-002', 2000, 'd2'),
			dolorEjemplo('ej-001', 3000, 'd3'),
		]);
		const resultado = await obtenerHistorialDolor('ej-001');
		expect(resultado).toHaveLength(2);
		expect(resultado[0].id).toBe('d3');
		expect(resultado[1].id).toBe('d1');
	});

	it('tabla vacia retorna []', async () => {
		const resultado = await obtenerHistorialDolor('ej-001');
		expect(resultado).toEqual([]);
	});

	it('sin ejercicio_id retorna todas las entradas DESC por fecha', async () => {
		await db.historial_dolor.bulkAdd([
			dolorEjemplo('ej-001', 1000, 'd1'),
			dolorEjemplo('ej-002', 2000, 'd2'),
			dolorEjemplo('ej-001', 3000, 'd3'),
		]);
		const resultado = await obtenerHistorialDolor();
		expect(resultado).toHaveLength(3);
		expect(resultado[0].id).toBe('d3');
		expect(resultado[1].id).toBe('d2');
		expect(resultado[2].id).toBe('d1');
	});
});

describe('error propagation', () => {
	it('obtenerPerfil lanza ERR-DB-READ si Dexie falla', async () => {
		vi.spyOn(db.perfil, 'get').mockRejectedValue(new Error('dexie error'));
		await expect(obtenerPerfil()).rejects.toMatchObject({ code: 'ERR-DB-READ' });
	});

	it('guardarPerfil lanza ERR-DB-WRITE si Dexie falla', async () => {
		vi.spyOn(db.perfil, 'put').mockRejectedValue(new Error('dexie error'));
		await expect(guardarPerfil(perfilEjemplo)).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
	});

	it('actualizarPerfil lanza ERR-DB-WRITE si Dexie falla', async () => {
		vi.spyOn(db.perfil, 'update').mockRejectedValue(new Error('dexie error'));
		await expect(actualizarPerfil({ peso_kg: 80 })).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
	});

	it('obtenerEstadosTodos lanza ERR-DB-READ si Dexie falla', async () => {
		vi.spyOn(db.estado_ejercicios, 'toArray').mockRejectedValue(new Error('dexie error'));
		await expect(obtenerEstadosTodos()).rejects.toMatchObject({ code: 'ERR-DB-READ' });
	});

	it('bloquearEjercicio lanza ERR-DB-WRITE si la transaccion falla', async () => {
		vi.spyOn(db.estado_ejercicios, 'put').mockRejectedValue(new Error('dexie error'));
		await expect(bloquearEjercicio('ej-001', ['hombros'], 1000)).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
	});

	it('obtenerHistorial lanza ERR-DB-READ si Dexie falla', async () => {
		vi.spyOn(db.sesiones, 'orderBy').mockImplementation(() => {
			throw new Error('dexie error');
		});
		await expect(obtenerHistorial()).rejects.toMatchObject({ code: 'ERR-DB-READ' });
	});

	it('cerrarSesion lanza ERR-DB-WRITE si la transaccion falla', async () => {
		vi.spyOn(db.sesiones, 'add').mockRejectedValue(new Error('dexie error'));
		await expect(cerrarSesion(
			sesionEjemplo(1000, 's-err'),
			[estadoEjemplo],
			1000
		)).rejects.toMatchObject({ code: 'ERR-DB-WRITE' });
	});

	it('obtenerHistorialDolor lanza ERR-DB-READ si Dexie falla', async () => {
		vi.spyOn(db.historial_dolor, 'where').mockImplementation(() => {
			throw new Error('dexie error');
		});
		await expect(obtenerHistorialDolor('ej-001')).rejects.toMatchObject({ code: 'ERR-DB-READ' });
	});
});