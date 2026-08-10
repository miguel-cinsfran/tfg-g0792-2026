// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Cabecera from './Cabecera.svelte';

function snippetTitulo(texto: string) {
	return createRawSnippet(() => ({ render: () => `<h1>${texto}</h1>` }));
}

describe('Cabecera', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('el boton de retroceso va inmediatamente antes del h1 en el DOM', () => {
		instancia = mount(Cabecera, {
			target: document.body,
			props: { onclick: () => {}, children: snippetTitulo('Ayuda') },
		});
		flushSync();

		const enOrden = Array.from(document.body.querySelectorAll('button, h1'));
		expect(enOrden.length).toBe(2);
		expect(enOrden[0].tagName).toBe('BUTTON');
		expect(enOrden[1].tagName).toBe('H1');
	});

	it('el aria-label por defecto del boton es "Atrás"', () => {
		instancia = mount(Cabecera, {
			target: document.body,
			props: { onclick: () => {}, children: snippetTitulo('Ayuda') },
		});
		flushSync();

		const boton = document.body.querySelector('button');
		expect(boton?.getAttribute('aria-label')).toBe('Atrás');
	});

	it('pasa la etiqueta al boton de retroceso', () => {
		instancia = mount(Cabecera, {
			target: document.body,
			props: { onclick: () => {}, etiqueta: 'Volver al inicio', children: snippetTitulo('Sesión') },
		});
		flushSync();

		const boton = document.body.querySelector('button');
		expect(boton?.getAttribute('aria-label')).toBe('Volver al inicio');
	});

	it('el click del boton dispara el onclick provisto', () => {
		const fn = vi.fn();
		instancia = mount(Cabecera, {
			target: document.body,
			props: { onclick: fn, children: snippetTitulo('Ayuda') },
		});
		flushSync();

		(document.body.querySelector('button') as HTMLButtonElement).click();
		expect(fn).toHaveBeenCalledOnce();
	});

	it('el h1 de la pantalla se renderiza dentro de la barra', () => {
		instancia = mount(Cabecera, {
			target: document.body,
			props: { onclick: () => {}, children: snippetTitulo('Ayuda') },
		});
		flushSync();

		const h1 = document.body.querySelector('h1');
		expect(h1?.textContent).toBe('Ayuda');
	});
});
