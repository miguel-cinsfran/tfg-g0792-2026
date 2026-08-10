// @vitest-environment jsdom
//
// Pagina /ayuda: cada tema vive en un <details> con su <h2> DENTRO del
// <summary> (docs/convenciones-ui.md: plegable y navegable por
// encabezados a la vez). Los textos salen de M.ayuda: la ruta no
// duplica ni reformula nada.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaAyuda from './+page.svelte';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
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
	page: { url: { searchParams: new URLSearchParams() } },
}));

// BotonVolver suena al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
}));

const CAMPOS = ['vibracion', 'chequeo', 'racha', 'sonidos', 'reanudar'] as const;

describe('Pagina de ayuda', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('cinco <details> en el orden de los temas, con h2 de M.ayuda dentro de cada summary', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const detalles = document.body.querySelectorAll('details');
		expect(detalles.length).toBe(5);

		CAMPOS.forEach((campo, i) => {
			const summary = detalles[i].querySelector('summary');
			expect(summary, `summary ${i} existe`).not.toBeNull();
			const h2 = summary?.querySelectorAll('h2');
			expect(h2?.length, `un unico h2 en el summary ${i}`).toBe(1);
			expect(h2?.[0].textContent).toBe(M.ayuda[`${campo}Titulo`]);
		});
	});

	it('cada <details> conserva el texto del cuerpo desde M.ayuda', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const detalles = document.body.querySelectorAll('details');
		CAMPOS.forEach((campo, i) => {
			const parrafo = detalles[i].querySelector('p');
			expect(parrafo?.textContent).toBe(M.ayuda[`${campo}Texto`]);
		});
	});

	it('un solo h1 con el titulo y ningun otro encabezado repetido', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const h1s = document.body.querySelectorAll('h1');
		expect(h1s.length).toBe(1);
		expect(h1s[0].textContent).toBe(M.ayuda.titulo);

		const conElTitulo = Array.from(document.body.querySelectorAll('h1, h2')).filter(
			(h) => h.textContent === M.ayuda.titulo,
		);
		expect(conElTitulo.length).toBe(1);
	});

	it('navegacion por encabezados: exactamente un h1 y cinco h2', () => {
		instancia = mount(PaginaAyuda, { target: document.body });
		flushSync();

		const h1s = document.body.querySelectorAll('h1');
		const h2s = document.body.querySelectorAll('h2');
		expect(h1s.length).toBe(1);
		expect(h2s.length).toBe(5);
	});
});
