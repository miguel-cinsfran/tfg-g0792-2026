// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import BarraAccion from './BarraAccion.svelte';

// jsdom no trae ResizeObserver, que Svelte usa para bind:clientHeight
// (la medicion del espaciador). Stub inerte: aca no se mide layout real.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

function snippetBoton(texto: string) {
	return createRawSnippet(() => ({ render: () => `<button>${texto}</button>` }));
}

describe('BarraAccion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('renderiza la accion primaria dentro de un contenedor con aria-label', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();

		const region = document.body.querySelector('[role="region"]');
		expect(region).not.toBeNull();
		expect(region?.getAttribute('aria-label')).toBe('Acciones de la pantalla');
	});

	it('reserva espacio en el flujo con un espaciador aria-hidden antes de la barra', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();

		const region = document.body.querySelector('[role="region"]') as HTMLElement;
		const previo = region.previousElementSibling as HTMLElement;
		expect(previo).not.toBeNull();
		expect(previo.getAttribute('aria-hidden')).toBe('true');
	});

	it('la region usa posicion fija al pie (bottom-0) y respeta safe-area-inset-bottom', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();

		const region = document.body.querySelector('[role="region"]');
		const clase = region?.className ?? '';
		// fixed bottom-0 left-0 right-0
		expect(clase).toMatch(/fixed/);
		expect(clase).toMatch(/bottom-0/);
		expect(clase).toMatch(/left-0/);
		expect(clase).toMatch(/right-0/);
		// safe area
		expect(clase).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
		// borde superior + bg surface
		expect(clase).toMatch(/border-t/);
		expect(clase).toMatch(/border-border/);
		expect(clase).toMatch(/bg-surface/);
	});

	it('el contenido interno esta centrado y limitado al max-w-lg', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();

		const region = document.body.querySelector('[role="region"]') as HTMLElement;
		const contenedor = region.querySelector('div') as HTMLElement;
		expect(contenedor.className).toMatch(/mx-auto/);
		expect(contenedor.className).toMatch(/max-w-lg/);
	});

	it('renderiza la primaria si la secundaria no se provee', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();

		const botones = document.body.querySelectorAll('button');
		expect(botones.length).toBe(1);
		expect(botones[0].textContent).toBe('Continuar');
	});

	it('renderiza secundaria cuando se provee', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: {
				primaria: snippetBoton('Continuar'),
				secundaria: snippetBoton('Atrás'),
			},
		});
		flushSync();

		const botones = document.body.querySelectorAll('button');
		expect(botones.length).toBe(2);
		expect(botones[0].textContent).toBe('Continuar');
		expect(botones[1].textContent).toBe('Atrás');
	});

	it('la primaria aparece ANTES que la secundaria en orden de lectura (DOM)', () => {
		instancia = mount(BarraAccion, {
			target: document.body,
			props: {
				primaria: snippetBoton('PRIMARIA'),
				secundaria: snippetBoton('SECUNDARIA'),
			},
		});
		flushSync();

		const todos = Array.from(document.body.querySelectorAll('button')).map(
			(b) => b.textContent,
		);
		const idxPrimaria = todos.indexOf('PRIMARIA');
		const idxSecundaria = todos.indexOf('SECUNDARIA');
		expect(idxPrimaria).toBeLessThan(idxSecundaria);
	});
});
