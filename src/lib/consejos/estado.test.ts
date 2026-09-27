// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Perfil } from '$lib/motor/schema';
import { leerContadorArranques, leerMostrados } from './preferencias';
import { CONSEJOS } from './datos';

const perfil: Perfil = {
	id: 1,
	nombre: 'Test',
	anio_nacimiento: 1990,
	peso_kg: 70,
	disclaimer_aceptado: true,
	fecha_aceptacion_disclaimer: 1,
	objetivo: 'fuerza',
	nivel_experiencia: 'principiante',
	evaluacion_por_patron: {
		PUSH: 'principiante',
		PULL: 'principiante',
		LEGS: 'principiante',
		CORE: 'principiante',
	},
	ajuste_desbalance_activo: null,
	fecha_evaluacion: 1,
	dias_semana: 3,
	duracion_sesion_min: 30,
	split: 'FULL_BODY',
	zonas_dolor_preexistente: [],
	tiene_anclaje: false,
	fecha_primera_sesion: null,
};

describe('prepararConsejoDelArranque', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('incrementa el conteo por arranque aun sin perfil', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(null);
		expect(leerContadorArranques()).toBe(1);
		estado.prepararConsejoDelArranque(null);
		expect(leerContadorArranques()).toBe(2);
	});

	it('sin perfil no hay consejo ni consumo de ids del pool', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(null);
		estado.prepararConsejoDelArranque(null);
		expect(estado.consejoDelArranque()).toBeNull();
		expect(leerMostrados()).toEqual([]);
	});

	it('primer arranque con perfil no selecciona', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(perfil);
		expect(estado.consejoDelArranque()).toBeNull();
		expect(leerMostrados()).toEqual([]);
	});

	it('segundo arranque con perfil selecciona y persiste el id', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(perfil);
		estado.prepararConsejoDelArranque(perfil);
		const consejo = estado.consejoDelArranque();
		expect(consejo).not.toBeNull();
		expect(leerMostrados()).toEqual([consejo?.id]);
	});

	it('al agotarse el pool reinicia y persiste el reinicio', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		const todosLosIds = CONSEJOS.map((c) => c.id);
		// Primer arranque no selecciona; los siguientes agotan el pool.
		for (let i = 0; i < todosLosIds.length + 1; i++) {
			estado.prepararConsejoDelArranque(perfil);
		}
		expect(leerMostrados()).toEqual(todosLosIds);
		// El siguiente arranque reinicia el pool y vuelve a [id].
		estado.prepararConsejoDelArranque(perfil);
		const elegido = estado.consejoDelArranque();
		expect(elegido).not.toBeNull();
		expect(leerMostrados()).toEqual([elegido?.id]);
	});

	it('con la preferencia apagada no selecciona ni consume ids', async () => {
		vi.resetModules();
		const preferencias = await import('./preferencias');
		preferencias.establecerConsejosActivados(false);
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(perfil);
		estado.prepararConsejoDelArranque(perfil);
		expect(estado.consejoDelArranque()).toBeNull();
		expect(leerMostrados()).toEqual([]);
	});

	it('cada llamada re-incrementa el conteo (por arranque, no por montaje)', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.prepararConsejoDelArranque(perfil);
		estado.prepararConsejoDelArranque(perfil);
		estado.prepararConsejoDelArranque(perfil);
		expect(leerContadorArranques()).toBe(3);
	});
});

describe('flag de anuncio', () => {
	it('arranca en false y marcarConsejoAnunciado lo pone en true', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		expect(estado.consejoAnunciado()).toBe(false);
		estado.marcarConsejoAnunciado();
		expect(estado.consejoAnunciado()).toBe(true);
	});

	it('preparar el arranque resetea el flag', async () => {
		vi.resetModules();
		const estado = await import('./estado');
		estado.marcarConsejoAnunciado();
		estado.prepararConsejoDelArranque(perfil);
		estado.prepararConsejoDelArranque(perfil);
		expect(estado.consejoAnunciado()).toBe(false);
	});
});
