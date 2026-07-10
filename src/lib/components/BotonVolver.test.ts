// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BotonVolver from './BotonVolver.svelte';

describe('BotonVolver', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('usa el aria-label dado (sobreescribe el default)', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {}, etiqueta: 'Volver al inicio' },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.getAttribute('aria-label')).toBe('Volver al inicio');
	});

	it('el aria-label por defecto es "Atrás" cuando no se pasa etiqueta', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {} },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.getAttribute('aria-label')).toBe('Atrás');
	});

	it('el icono SVG va aria-hidden para que el lector lea solo el aria-label', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {} },
		});
		flushSync();
		const svg = document.body.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	it('cumple target tactil minimo 44x44 (48x48 via min-h-12/min-w-12)', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {} },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.className).toMatch(/min-h-12/);
		expect(boton.className).toMatch(/min-w-12/);
	});

	it('el click dispara el onclick provisto', () => {
		const fn = vi.fn();
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: fn },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		expect(fn).toHaveBeenCalledOnce();
	});

	it('type="button" para no submitear forms vecinos', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {} },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.getAttribute('type')).toBe('button');
	});

	it('el foco visible usa el anillo de acento del sistema', () => {
		instancia = mount(BotonVolver, {
			target: document.body,
			props: { onclick: () => {} },
		});
		flushSync();
		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.className).toMatch(/focus-visible:ring-acento/);
	});
});
