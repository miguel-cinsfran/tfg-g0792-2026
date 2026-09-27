// @vitest-environment jsdom
//
// Pantalla de inicio: el boton "Empezar entrenamiento" avisa cuando hay
// una sesion sin terminar. Con sesion guardada se llama "Continuar
// sesion" (M.inicio.botonEmpezarEntrenamientoSesion); sin sesion,
// conserva el nombre de siempre. La asercion va sobre el nombre
// accesible, nunca sobre clases ni sobre la presencia del SVG.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { mount, unmount, flushSync } from 'svelte';
import PaginaInicio from './+page.svelte';
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import { popularCatalogo } from '$lib/catalogo/cargar';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { M } from '$lib/mensajes/ui';
import type { SesionEnCursoGuardada } from '$lib/db/db';

const estadoMock = vi.hoisted(() => ({
	perfil: null as unknown,
	sesionEnCurso: null as SesionEnCursoGuardada | null,
	obtenerSesionEnCursoMock: vi.fn(),
	gotoMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	anunciarErrorMock: vi.fn(),
	sonarMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
}));

vi.mock('$lib/errores/anunciar', () => ({
	anunciarError: (...args: unknown[]) => estadoMock.anunciarErrorMock(...args),
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
}));

vi.mock('$lib/db/perfil', () => ({
	obtenerPerfil: () => Promise.resolve(estadoMock.perfil),
}));

vi.mock('$lib/db/estado', () => ({
	obtenerEstadosTodos: () => Promise.resolve([]),
	marcarResuelto: () => Promise.resolve(),
	reprogramarRevision: () => Promise.resolve(),
	PREFIJO_RAZON_DOLOR: 'Dolor en ',
}));

vi.mock('$lib/db/sesiones', () => ({
	obtenerHistorial: () => Promise.resolve([]),
	obtenerUltimaSesion: () => Promise.resolve(null),
}));

vi.mock('$lib/db/sesion-en-curso', () => ({
	obtenerSesionEnCurso: (...args: unknown[]) => estadoMock.obtenerSesionEnCursoMock(...args),
}));

describe('Boton "Empezar entrenamiento" con sesion en curso', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.sesionEnCurso = null;
		popularCatalogo(catalogoRaw);
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function nombreAccesible(boton: HTMLButtonElement): string {
		return boton.getAttribute('aria-label') ?? boton.textContent?.trim() ?? '';
	}

	it('sin sesion guardada: el boton conserva el nombre de siempre', async () => {
		instancia = mount(PaginaInicio, { target: document.body });
		flushSync();

		const boton = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => nombreAccesible(el as HTMLButtonElement) === M.inicio.botonEmpezarEntrenamiento,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});

		expect(nombreAccesible(boton)).toBe(M.inicio.botonEmpezarEntrenamiento);
		expect(
			Array.from(document.body.querySelectorAll('button')).some(
				(el) => nombreAccesible(el as HTMLButtonElement) === M.inicio.botonEmpezarEntrenamientoSesion,
			),
		).toBe(false);
	});

	it('con sesion guardada: el nombre accesible avisa y el de siempre desaparece', async () => {
		estadoMock.sesionEnCurso = {
			id: 1,
			guardada_en: Date.now(),
			sesion: {
				tipo: 'FULL_BODY',
				fecha_inicio: Date.now(),
				plan: [],
				indice_ejercicio: 0,
				indice_serie: 0,
				ejecutados: [],
				cancelada_por_dolor: false,
			},
		};
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(estadoMock.sesionEnCurso);

		instancia = mount(PaginaInicio, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => nombreAccesible(el as HTMLButtonElement) === M.inicio.botonEmpezarEntrenamientoSesion,
			);
			expect(b).toBeDefined();
		});
		expect(
			Array.from(document.body.querySelectorAll('button')).some(
				(el) => nombreAccesible(el as HTMLButtonElement) === M.inicio.botonEmpezarEntrenamiento,
			),
		).toBe(false);
	});
});
