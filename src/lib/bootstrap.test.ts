// Test scaffold for bootstrap.ts (ADR-0008, ADR-0012)
// Phase 1 (RED): these tests will fail until bootstrap.ts is implemented.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { crearError } from '$lib/errores/crear';

// Mock popularCatalogo to control Zod success/fail
const popularCatalogoMock = vi.fn();
vi.mock('$lib/catalogo/cargar', () => ({
	popularCatalogo: (...args: unknown[]) => popularCatalogoMock(...args),
}));

// Mock obtenerPerfil
const obtenerPerfilMock = vi.fn();
vi.mock('$lib/db/perfil', () => ({
	obtenerPerfil: (...args: unknown[]) => obtenerPerfilMock(...args),
}));

// Mock db.perfil.count via mocking the db module
vi.mock('$lib/db/db', () => ({
	db: { perfil: { count: vi.fn() } },
}));

// Mock de perf (no-op en tests)
vi.mock('$lib/perf', () => ({
	marcar: vi.fn(() => 0),
	medir: vi.fn(),
}));

import { db } from '$lib/db/db';

const perfilEjemplo = {
	id: 1 as const,
	nombre: 'Test',
	anio_nacimiento: 1990,
	peso_kg: 70,
	disclaimer_aceptado: true,
	fecha_aceptacion_disclaimer: 1000000,
	objetivo: 'fuerza' as const,
	nivel_experiencia: 'principiante' as const,
	evaluacion_por_patron: { PUSH: 'principiante' as const, PULL: 'principiante' as const, LEGS: 'principiante' as const, CORE: 'principiante' as const },
	ajuste_desbalance_activo: null,
	fecha_evaluacion: 1000000,
	dias_semana: 3,
	duracion_sesion_min: 30,
	split: 'FULL_BODY' as const,
	zonas_dolor_preexistente: [],
	tiene_anclaje: false,
	fecha_primera_sesion: null,
};

describe('iniciarApp', () => {
	beforeEach(() => {
		popularCatalogoMock.mockReset();
		obtenerPerfilMock.mockReset();
		vi.mocked(db.perfil.count).mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('sin perfil guardado devuelve { perfil: null }', async () => {
		vi.resetModules();
		popularCatalogoMock.mockReturnValue(undefined);
		vi.mocked(db.perfil.count).mockResolvedValue(0);
		obtenerPerfilMock.mockResolvedValue(undefined);
		const { iniciarApp } = await import('$lib/bootstrap');
		const result = await iniciarApp();
		expect(result).toEqual({ perfil: null });
	});

	it('con perfil guardado devuelve { perfil: <Perfil> }', async () => {
		vi.resetModules();
		popularCatalogoMock.mockReturnValue(undefined);
		vi.mocked(db.perfil.count).mockResolvedValue(1);
		obtenerPerfilMock.mockResolvedValue(perfilEjemplo);
		const { iniciarApp } = await import('$lib/bootstrap');
		const result = await iniciarApp();
		expect(result).toEqual({ perfil: perfilEjemplo });
	});

	it('propaga ERR-BOOT-CATALOGO si popularCatalogo falla', async () => {
		vi.resetModules();
		popularCatalogoMock.mockImplementation(() => {
			throw crearError('ERR-BOOT-CATALOGO', 'Catálogo inválido: (raíz)');
		});
		const { iniciarApp } = await import('$lib/bootstrap');
		await expect(iniciarApp()).rejects.toMatchObject({ code: 'ERR-BOOT-CATALOGO' });
	});

	it('lanza ERR-BOOT-DEXIE si db.perfil.count falla', async () => {
		vi.resetModules();
		popularCatalogoMock.mockReturnValue(undefined);
		vi.mocked(db.perfil.count).mockRejectedValue(new Error('db closed'));
		const { iniciarApp } = await import('$lib/bootstrap');
		await expect(iniciarApp()).rejects.toMatchObject({ code: 'ERR-BOOT-DEXIE' });
	});

	it('envuelve ERR-DB-READ de obtenerPerfil como ERR-BOOT-DEXIE', async () => {
		vi.resetModules();
		popularCatalogoMock.mockReturnValue(undefined);
		vi.mocked(db.perfil.count).mockResolvedValue(0);
		obtenerPerfilMock.mockRejectedValue(crearError('ERR-DB-READ', 'Error al obtener perfil'));
		const { iniciarApp } = await import('$lib/bootstrap');
		await expect(iniciarApp()).rejects.toMatchObject({ code: 'ERR-BOOT-DEXIE' });
	});

	it('la segunda llamada devuelve el perfil cacheado sin re-ejecutar', async () => {
		vi.resetModules();
		popularCatalogoMock.mockReturnValue(undefined);
		vi.mocked(db.perfil.count).mockResolvedValue(1);
		obtenerPerfilMock.mockResolvedValue(perfilEjemplo);
		const { iniciarApp } = await import('$lib/bootstrap');
		const first = await iniciarApp();
		const second = await iniciarApp();
		expect(first).toEqual({ perfil: perfilEjemplo });
		expect(second).toEqual({ perfil: perfilEjemplo });
		expect(popularCatalogoMock).toHaveBeenCalledTimes(1);
	});
});

describe('+layout.ts load()', () => {
	it('traduce ERR-BOOT-CATALOGO a { error: code }', async () => {
		vi.resetModules();
		popularCatalogoMock.mockImplementation(() => {
			throw crearError('ERR-BOOT-CATALOGO', 'Catálogo inválido: (raíz)');
		});
		const mod = await import('../routes/+layout') as Record<string, unknown>;
		const loadFn = mod.load as () => Promise<Record<string, unknown>>;
		await expect(loadFn()).resolves.toEqual({ error: 'ERR-BOOT-CATALOGO' });
	});
});