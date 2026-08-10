// @vitest-environment node
//
// Wiring de las consultas reactivas de la UI (suscribirPerfil /
// suscribirBloqueados): centralizan el liveQuery y el mapeo de error
// que cada ruta repetia a mano.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from './db';
import { guardarPerfil } from './perfil';
import { guardarEstado } from './estado';
import { suscribirPerfil, suscribirBloqueados } from './consultas';
import type { Perfil, EstadoEjercicio } from '$lib/motor/schema';

beforeEach(async () => {
	if (!db.isOpen()) await db.open();
});

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(db.tables.map((t) => t.clear()));
});

const perfilEjemplo: Omit<Perfil, 'id'> = {
	nombre: 'Ana',
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

describe('suscribirPerfil', () => {
	it('entrega el perfil guardado (Perfil, no undefined)', async () => {
		await guardarPerfil({ ...perfilEjemplo, nombre: 'Ana' });
		const alRecibir = vi.fn();
		const desuscribir = suscribirPerfil(alRecibir, vi.fn());
		await vi.waitFor(() => {
			expect(alRecibir).toHaveBeenCalled();
		});
		expect(alRecibir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Ana' }));
		desuscribir();
	});

	it('entrega null cuando no hay perfil guardado', async () => {
		const alRecibir = vi.fn();
		const desuscribir = suscribirPerfil(alRecibir, vi.fn());
		await vi.waitFor(() => {
			expect(alRecibir).toHaveBeenCalled();
		});
		expect(alRecibir).toHaveBeenCalledWith(null);
		desuscribir();
	});

	it('la desuscripcion corta la suscripcion sin errores', () => {
		const alRecibir = vi.fn();
		const desuscribir = suscribirPerfil(alRecibir, vi.fn());
		expect(() => desuscribir()).not.toThrow();
	});
});

describe('suscribirBloqueados', () => {
	const estadoBloqueado: EstadoEjercicio = {
		ejercicio_id: 'ej-001-push-h-flexion-pared',
		series_objetivo: 3,
		reps_objetivo: 8,
		bloqueado: true,
		razon_bloqueo: 'Dolor en hombros',
		fecha_bloqueo: 1000,
		fecha_revision: 1000 + 86400000,
		fecha_ultimo_uso: null,
	};

	const estadoLibre: EstadoEjercicio = {
		...estadoBloqueado,
		ejercicio_id: 'ej-002-push-v-flexion-inclinada',
		bloqueado: false,
		razon_bloqueo: null,
		fecha_bloqueo: null,
		fecha_revision: null,
	};

	it('entrega solo los estados bloqueados', async () => {
		await guardarEstado(estadoBloqueado);
		await guardarEstado(estadoLibre);
		const alRecibir = vi.fn();
		const desuscribir = suscribirBloqueados(alRecibir, vi.fn());
		await vi.waitFor(() => {
			expect(alRecibir).toHaveBeenCalled();
		});
		expect(alRecibir).toHaveBeenCalledWith([expect.objectContaining({ ejercicio_id: 'ej-001-push-h-flexion-pared' })]);
		desuscribir();
	});

	it('entrega lista vacia cuando no hay bloqueados', async () => {
		await guardarEstado(estadoLibre);
		const alRecibir = vi.fn();
		const desuscribir = suscribirBloqueados(alRecibir, vi.fn());
		await vi.waitFor(() => {
			expect(alRecibir).toHaveBeenCalled();
		});
		expect(alRecibir).toHaveBeenCalledWith([]);
		desuscribir();
	});
});
