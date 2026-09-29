// @vitest-environment jsdom
//
// Índice /ayuda: un h2 por grupo con temas y, bajo cada uno, una fila
// por tema que navega a /ayuda/<id>. Los textos salen de M.ayuda: la
// ruta no duplica ni reformula nada.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaAyuda from './+page.svelte';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	sonarMock: vi.fn(),
	de: null as string | null,
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string, params?: Record<string, string>) => {
		if (!params) return ruta;
		return ruta.replace('[tema]', params.tema ?? '');
	},
}));

vi.mock('$app/state', () => ({
	page: {
		url: {
			get searchParams() {
				return new URLSearchParams(estadoMock.de === null ? '' : `de=${estadoMock.de}`);
			},
		},
	},
}));

// BotonVolver suena al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
}));

function gruposVisibles() {
	return M.ayuda.grupos.filter((g) => g.temas.length > 0);
}

describe('Índice de ayuda', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.de = null;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('un h2 por grupo con temas, en el orden de M.ayuda', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const h2s = [...document.body.querySelectorAll('h2')].map((h) => h.textContent);
		expect(h2s).toEqual(gruposVisibles().map((g) => g.titulo));
	});

	it('una fila por tema con el título como nombre accesible', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const filas = [...document.body.querySelectorAll('button.fila-configuracion')];
		const esperados = gruposVisibles().flatMap((g) => g.temas.map((id) => M.ayuda.temas[id].titulo));
		expect(filas.map((f) => f.textContent?.trim())).toEqual(esperados);
		for (const fila of filas) {
			expect(fila.getAttribute('aria-label') ?? fila.textContent?.trim()).toContain(
				M.ayuda.temas[
					gruposVisibles().flatMap((g) => g.temas)[filas.indexOf(fila)]
				].titulo
			);
		}
	});

	it('tocar una fila navega a /ayuda/<id>', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const fila = [...document.body.querySelectorAll<HTMLButtonElement>('button.fila-configuracion')].find(
			(b) => b.textContent?.trim() === M.ayuda.temas['racha'].titulo
		);
		expect(fila, 'fila de racha presente').not.toBeUndefined();
		fila?.click();
		flushSync();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/ayuda/racha');
	});

	it('con ?de=config la fila conserva el origen en el destino', () => {
		estadoMock.de = 'config';
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const fila = document.body.querySelector<HTMLButtonElement>('button.fila-configuracion');
		fila?.click();
		flushSync();

		const destino = estadoMock.gotoMock.mock.calls[0]?.[0] as string;
		expect(destino).toContain('/ayuda/');
		expect(destino).toContain('de=config');
	});

	it('un solo h1 con el título', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const h1s = document.body.querySelectorAll('h1');
		expect(h1s.length).toBe(1);
		expect(h1s[0].textContent).toBe(M.ayuda.titulo);
	});

	it('seis grupos y veintidós filas, uno por tema del manual', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		expect(document.body.querySelectorAll('h2').length).toBe(6);
		expect(document.body.querySelectorAll('button.fila-configuracion').length).toBe(22);
	});
});
