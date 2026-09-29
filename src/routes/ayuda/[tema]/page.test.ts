// @vitest-environment jsdom
//
// Pantalla /ayuda/[tema]: h1 con el título del tema y su cuerpo por
// bloques. Un id desconocido rinde el aviso; el Atrás vuelve siempre
// al índice, conservando ?de=config cuando lo había.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaTema from './+page.svelte';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	tema: 'racha',
	de: null as string | null,
	gotoMock: vi.fn(),
	sonarMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$app/state', () => ({
	page: {
		url: {
			get searchParams() {
				return new URLSearchParams(estadoMock.de === null ? '' : `de=${estadoMock.de}`);
			},
		},
		get params() {
			return { tema: estadoMock.tema };
		},
	},
}));

// BotonVolver suena al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
}));

describe('Pantalla de tema de ayuda', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.tema = 'racha';
		estadoMock.de = null;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function clickAtras(): void {
		const atras = document.body.querySelector<HTMLButtonElement>('button[aria-label="Atrás"]');
		expect(atras, 'Atrás visible presente').not.toBeNull();
		atras?.click();
		flushSync();
	}

	it('muestra el h1 con el título del tema y su texto', () => {
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		const h1 = document.body.querySelector('h1');
		expect(h1?.textContent).toBe(M.ayuda.temas['racha'].titulo);
		const cuerpo = document.body.querySelector('p')?.textContent ?? '';
		expect(cuerpo.length).toBeGreaterThan(0);
		expect(cuerpo).toContain('La racha son semanas completas');
	});

	it('un id desconocido muestra "Tema no encontrado" e invita a volver', () => {
		estadoMock.tema = 'no-existe';
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		expect(document.body.querySelector('h1')?.textContent).toBe(M.ayuda.noEncontradoTitulo);
		expect(document.body.querySelector('p')?.textContent).toBe(M.ayuda.noEncontradoTexto);
	});

	it('el Atrás lleva al índice /ayuda', () => {
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		clickAtras();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/ayuda');
	});

	it('con ?de=config el Atrás conserva el origen', () => {
		estadoMock.de = 'config';
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		clickAtras();

		const destino = estadoMock.gotoMock.mock.calls[0]?.[0] as string;
		expect(destino).toContain('/ayuda');
		expect(destino).toContain('de=config');
	});

	it('rinde el texto de cada bloque del tema, no solo el primero', () => {
		estadoMock.tema = 'dolor';
		const bloques = M.ayuda.temas['dolor'].bloques;
		expect(bloques.length).toBeGreaterThanOrEqual(2);
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		const cuerpo = document.body.textContent ?? '';
		for (const bloque of bloques) {
			if ('texto' in bloque) {
				expect(cuerpo).toContain(bloque.texto);
			} else {
				for (const paso of bloque.pasos) {
					expect(cuerpo).toContain(paso);
				}
			}
		}
	});

	it('el foco queda en el h1 con el título del tema', () => {
		instancia = mount(PaginaTema, { target: document.body });
		flushSync();

		const h1 = document.querySelector('h1');
		expect(h1?.textContent).toBe(M.ayuda.temas['racha'].titulo);
		expect(document.activeElement).toBe(h1);
	});
});

describe('Manual de uso completo', () => {
	it('son 22 temas: si el bucle siguiente pasa con cero, este lo dice', () => {
		expect(Object.keys(M.ayuda.temas).length).toBe(22);
	});

	it('cada tema tiene título y al menos un bloque no vacío', () => {
		for (const [id, tema] of Object.entries(M.ayuda.temas)) {
			expect(tema.titulo.trim().length, `título de ${id}`).toBeGreaterThan(0);
			expect(tema.bloques.length, `bloques de ${id}`).toBeGreaterThan(0);
			for (const bloque of tema.bloques) {
				if ('texto' in bloque) {
					expect(bloque.texto.trim().length, `párrafo de ${id}`).toBeGreaterThan(0);
				} else {
					expect(bloque.pasos.length, `pasos de ${id}`).toBeGreaterThan(0);
					for (const paso of bloque.pasos) {
						expect(paso.trim().length, `paso de ${id}`).toBeGreaterThan(0);
					}
				}
			}
		}
	});

	it('todo id de los grupos existe en los temas, sin repetir', () => {
		const ids = M.ayuda.grupos.flatMap((g) => g.temas);
		expect(ids.length).toBe(22);
		expect(new Set(ids).size).toBe(22);
		for (const id of ids) {
			expect(M.ayuda.temas[id], `tema ${id} existe`).toBeDefined();
		}
	});

	it('dolor ordena detenerse ante un dolor agudo', () => {
		const textos = M.ayuda.temas['dolor'].bloques.map((b) => ('texto' in b ? b.texto : '')).join(' ');
		expect(textos).toContain('Detente ante un dolor agudo.');
	});

	it('copia no cambia nada si el archivo no es válido', () => {
		const textos = M.ayuda.temas['copia'].bloques.map((b) => ('texto' in b ? b.texto : '')).join(' ');
		expect(textos).toContain('si no es una copia válida, no cambia nada.');
	});

	it('salir descarta sin guardar si no hay series', () => {
		const textos = M.ayuda.temas['salir'].bloques.map((b) => ('texto' in b ? b.texto : '')).join(' ');
		expect(textos).toContain('Si todavía no hiciste ninguna, la sesión se descarta sin guardar nada.');
	});

	it('pausa deja la pregunta para después con Más tarde', () => {
		const textos = M.ayuda.temas['pausa'].bloques.map((b) => ('texto' in b ? b.texto : '')).join(' ');
		expect(textos).toContain('«Más tarde» deja la pregunta para después.');
	});
});
