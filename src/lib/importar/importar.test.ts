// Tests de importacion/exportacion (ADR-0003: Zod antes de escribir).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '$lib/db/db';
import { importarDatos, exportarDatos, validarExporte } from './importar';
import { VERSION_EXPORTE } from './schema';
import { perfilBase } from '../../../tests/fixtures/perfil-base';
import { sesionBase } from '../../../tests/fixtures/sesion-base';

beforeEach(async () => {
	if (!db.isOpen()) await db.open();
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
});

function exporteValido() {
	return {
		version: VERSION_EXPORTE,
		perfil: perfilBase(),
		estado_ejercicios: [],
		sesiones: [sesionBase({ id: 'sesion-import', fecha: 1000000 })],
		historial_dolor: [
			{ id: 'dolor-1', ejercicio_id: 'ej-001', zonas: ['hombros'], fecha: 1000000, estado: 'bloqueado' },
		],
	};
}

describe('validarExporte', () => {
	it('version desconocida lanza ERR-IMPORT-VERSION', () => {
		expect(() => validarExporte({ ...exporteValido(), version: 99 })).toThrow(
			expect.objectContaining({ code: 'ERR-IMPORT-VERSION' }),
		);
	});

	it('estructura invalida lanza ERR-IMPORT-INVALID sin escribir', async () => {
		const roto = { ...exporteValido(), sesiones: [{ id: 'x' }] };
		await expect(importarDatos(roto)).rejects.toMatchObject({ code: 'ERR-IMPORT-INVALID' });
		expect(await db.sesiones.count()).toBe(0);
	});

	it('lo que no es objeto lanza ERR-IMPORT-INVALID', () => {
		expect(() => validarExporte('no soy json valido')).toThrow(
			expect.objectContaining({ code: 'ERR-IMPORT-INVALID' }),
		);
	});
});

describe('importar y exportar (round-trip)', () => {
	it('importar reemplaza los cuatro almacenes y exportar devuelve lo mismo', async () => {
		// Dato preexistente que la importacion debe pisar.
		await db.sesiones.put(sesionBase({ id: 'sesion-vieja', fecha: 500 }));

		const exporte = exporteValido();
		await importarDatos(exporte);

		expect(await db.sesiones.count()).toBe(1);
		expect((await db.sesiones.toArray())[0].id).toBe('sesion-import');
		expect((await db.perfil.get(1))?.nombre).toBe(perfilBase().nombre);
		expect(await db.historial_dolor.count()).toBe(1);

		const reExportado = await exportarDatos();
		expect(reExportado.version).toBe(VERSION_EXPORTE);
		expect(reExportado.sesiones).toHaveLength(1);
		expect(reExportado.perfil?.nombre).toBe(perfilBase().nombre);
		// El round-trip valida: lo exportado vuelve a pasar la importacion.
		await importarDatos(reExportado);
	});

	it('exportar sin perfil devuelve perfil null y eso re-importa limpio', async () => {
		const exporte = await exportarDatos();
		expect(exporte.perfil).toBeNull();
		await importarDatos(exporte);
		expect(await db.perfil.get(1)).toBeUndefined();
	});
});
