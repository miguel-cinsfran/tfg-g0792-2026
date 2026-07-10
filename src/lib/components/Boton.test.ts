// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Boton from './Boton.svelte';
import { sonar } from '$lib/sonido/reproducir';

vi.mock('$lib/sonido/reproducir', () => ({ sonar: vi.fn() }));

function snippetTexto(texto: string) {
	return createRawSnippet(() => ({ render: () => texto }));
}

describe('Boton', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) {
			unmount(instancia);
		}
	});

	it('renderiza el texto del children', () => {
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Texto botón') },
		});
		flushSync();
		const boton = document.body.querySelector('button');
		expect(boton?.textContent).toBe('Texto botón');
	});

	it('click dispara onclick', () => {
		const fn = vi.fn();
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Click'), onclick: fn },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		expect(fn).toHaveBeenCalledOnce();
	});

	it('deshabilitado no dispara onclick', () => {
		const fn = vi.fn();
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Off'), onclick: fn, deshabilitado: true },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		expect(fn).not.toHaveBeenCalled();
	});

	it('type="button" por defecto', () => {
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Tipo') },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.getAttribute('type')).toBe('button');
	});

	it('con avance muestra flecha derecha envuelta en span', () => {
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Continuar'), avance: true },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		const span = boton.querySelector('span');
		expect(span).not.toBeNull();
		expect(span?.classList.contains('inline-flex')).toBe(true);
		expect(span?.classList.contains('items-center')).toBe(true);
		expect(span?.classList.contains('justify-center')).toBe(true);
		expect(span?.classList.contains('gap-2')).toBe(true);
		expect(span?.textContent).toContain('Continuar');
		const svg = boton.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	it('sin avance no muestra flecha ni span wrapper', () => {
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Guardar') },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		const span = boton.querySelector('span.inline-flex');
		expect(span).toBeNull();
		const svg = boton.querySelector('svg');
		expect(svg).toBeNull();
	});

	it('click dispara sonar("seleccion") por defecto', () => {
		const fn = vi.fn();
		vi.clearAllMocks();
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Click'), onclick: fn },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		expect(sonar).toHaveBeenCalledWith('seleccion');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('con silencioso no llama sonar("seleccion")', () => {
		const fn = vi.fn();
		vi.clearAllMocks();
		instancia = mount(Boton, {
			target: document.body,
			props: { children: snippetTexto('Click'), onclick: fn, silencioso: true },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		expect(sonar).not.toHaveBeenCalled();
		expect(fn).toHaveBeenCalledOnce();
	});
});