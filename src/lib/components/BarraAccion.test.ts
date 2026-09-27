// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import BarraAccion from './BarraAccion.svelte';

// jsdom no aplica media queries: la condicion de pantalla baja se fija
// sobre el texto del componente, no sobre el layout renderizado.
const fuente = readFileSync('src/lib/components/BarraAccion.svelte', 'utf-8');

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

describe('BarraAccion (estructural: pantalla baja por altura)', () => {
	// La condicion de la media query se declara sobre la ALTURA, nunca
	// sobre la anchura: la barra vuelve al flujo en horizontal y con
	// fuente agrandada, y el vertical queda intacto.
	it('la barra vuelve al flujo con una media query por max-height', () => {
		expect(fuente).toMatch(/\[@media\(max-height:[^)]*\)\]:static/);
		expect(fuente).not.toMatch(/max-width/);
	});

	it('el espaciador aria-hidden se oculta en la misma media query', () => {
		expect(fuente).toMatch(/\[@media\(max-height:[^)]*\)\]:hidden/);
	});

	it('la barra conserva position fixed por defecto (caso vertical intacto)', () => {
		expect(fuente).toMatch(/fixed/);
	});
});

describe('BarraAccion (sombra por contenido debajo)', () => {
	let instancia: ReturnType<typeof mount>;

	function region(): HTMLElement {
		return document.body.querySelector('[role="region"]') as HTMLElement;
	}

	function fijarVentana(altoDocumento: number, altoVisible: number, scroll: number): void {
		Object.defineProperty(document.documentElement, 'scrollHeight', {
			value: altoDocumento,
			configurable: true,
		});
		Object.defineProperty(window, 'innerHeight', { value: altoVisible, configurable: true });
		Object.defineProperty(window, 'scrollY', { value: scroll, configurable: true });
	}

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		// @ts-expect-error jsdom no expone estos setters: se borra lo fijado.
		delete document.documentElement.scrollHeight;
		// @ts-expect-error jsdom no expone estos setters: se borra lo fijado.
		delete window.innerHeight;
		// @ts-expect-error jsdom no expone estos setters: se borra lo fijado.
		delete window.scrollY;
	});

	it('con contenido por debajo muestra la sombra', () => {
		fijarVentana(2000, 500, 0);
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();
		window.dispatchEvent(new Event('scroll'));
		flushSync();
		expect(region().classList.contains('sombra-barra')).toBe(true);
	});

	it('al llegar al final la sombra desaparece', () => {
		fijarVentana(2000, 500, 0);
		instancia = mount(BarraAccion, {
			target: document.body,
			props: { primaria: snippetBoton('Continuar') },
		});
		flushSync();
		window.dispatchEvent(new Event('scroll'));
		flushSync();
		expect(region().classList.contains('sombra-barra')).toBe(true);

		fijarVentana(2000, 500, 1500);
		window.dispatchEvent(new Event('scroll'));
		flushSync();
		expect(region().classList.contains('sombra-barra')).toBe(false);
	});
});

describe('BarraAccion (estructural: jerarquia de las acciones)', () => {
	// La primaria flex-1 crece con el espacio sobrante; si la secundaria
	// no puede comprimirse (flex-shrink-0), se queda ancha y la primaria
	// termina mas angosta con texto en dos lineas. Con compresion
	// permitida, la primaria nunca queda mas chica que la secundaria.
	// El orden del DOM lo sigue fijando el caso renderizado de arriba.
	it('la primaria conserva flex-1 y la secundaria puede comprimirse (sin flex-shrink-0)', () => {
		expect(fuente).toMatch(/flex-1/);
		expect(fuente).not.toMatch(/sm:flex-shrink-0/);
	});
});
