// @vitest-environment jsdom
//
// Pantalla de perfil: "Tu plan" en formato Etiqueta: valor sin punto
// final, mas las frases de fuera del plan del resumen cuando aplican.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { mount, unmount, flushSync } from 'svelte';
import PaginaPerfil from './+page.svelte';
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import { popularCatalogo } from '$lib/catalogo/cargar';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import type { Perfil } from '$lib/motor/schema';

// jsdom no trae ResizeObserver; stub inerte por si un hijo lo usa.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const estadoMock = vi.hoisted(() => ({
	perfil: null as Perfil | null,
	gotoMock: vi.fn(),
	sonarMock: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$lib/db/consultas', () => ({
	suscribirPerfil: (alRecibir: (p: Perfil | null) => void) => {
		alRecibir(estadoMock.perfil);
		return () => {};
	}
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Perfil - Tu plan', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		popularCatalogo(catalogoRaw);
		estadoMock.gotoMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function texto(): string {
		return document.body.textContent ?? '';
	}

	it('lineas en formato Etiqueta: valor sin punto final', async () => {
		estadoMock.perfil = perfilBase();
		instancia = mount(PaginaPerfil, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			expect(texto()).toContain('Zonas con dolor: ninguna');
		});
		// Las frases de fuera del plan llegan por liveQuery: una espera
		// corta deja que se calculen antes de afirmar su ausencia.
		await new Promise((r) => setTimeout(r, 50));
		flushSync();

		expect(texto()).toContain('Nombre: Persona de prueba');
		expect(texto()).toContain('Objetivo: Hipertrofia');
		expect(texto()).toContain('Días por semana: 3');
		expect(texto()).toContain('Duración: 30 minutos');
		expect(texto()).toContain('Nivel: Principiante');
		expect(texto()).toContain('Equipo: con barra o anclaje');
		expect(texto()).not.toContain('barra o un anclaje');
		expect(texto()).not.toContain('deja fuera');
	});

	it('sin anclaje: equipo y frase de fuera del plan', async () => {
		estadoMock.perfil = perfilBase({ tiene_anclaje: false });
		instancia = mount(PaginaPerfil, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			expect(texto()).toContain('Equipo: sin barra ni anclaje');
		});
		await vi.waitFor(() => {
			expect(texto()).toContain(
				'Tu plan no incluye ejercicios de tirar porque necesitan una barra o un anclaje.'
			);
		});
	});
});
