// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import GrupoSeleccionMultiple from './GrupoSeleccionMultiple.svelte';

describe('GrupoSeleccionMultiple', () => {
	let instancia: ReturnType<typeof mount>;

	const OPCIONES = [
		{ valor: 'a', etiqueta: 'A' },
		{ valor: 'b', etiqueta: 'B' },
		{ valor: 'c', etiqueta: 'C' }
	];

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('renderiza legend y un checkbox por opcion', () => {
		instancia = mount(GrupoSeleccionMultiple, {
			target: document.body,
			props: { leyenda: 'Marca', nombre: 'g', opciones: OPCIONES, valores: [] }
		});
		flushSync();
		expect(document.body.querySelector('legend')?.textContent).toBe('Marca');
		expect(document.body.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
	});

	it('marca checked los checkboxes cuyos valores estan en el array', () => {
		instancia = mount(GrupoSeleccionMultiple, {
			target: document.body,
			props: { leyenda: 'Marca', nombre: 'g', opciones: OPCIONES, valores: ['a', 'c'] }
		});
		flushSync();
		const checks = document.body.querySelectorAll(
			'input[type="checkbox"]'
		) as NodeListOf<HTMLInputElement>;
		expect(checks[0].checked).toBe(true);
		expect(checks[1].checked).toBe(false);
		expect(checks[2].checked).toBe(true);
	});

	it('al marcar un checkbox, agrega el valor al array', () => {
		const setter = vi.fn();
		let actual: string[] = [];
		instancia = mount(GrupoSeleccionMultiple, {
			target: document.body,
			props: {
				leyenda: 'Marca',
				nombre: 'g',
				opciones: OPCIONES,
				get valores() {
					return actual;
				},
				set valores(v: string[]) {
					actual = v;
					setter(v);
				}
			}
		});
		flushSync();
		const checks = document.body.querySelectorAll(
			'input[type="checkbox"]'
		) as NodeListOf<HTMLInputElement>;
		checks[1].dispatchEvent(new Event('change', { bubbles: true }));
		expect(setter).toHaveBeenCalledTimes(1);
		expect(setter.mock.calls[0]?.[0]).toEqual(['b']);
	});

	it('al desmarcar un checkbox ya presente, lo quita del array', () => {
		const setter = vi.fn();
		let actual: string[] = ['a', 'b'];
		instancia = mount(GrupoSeleccionMultiple, {
			target: document.body,
			props: {
				leyenda: 'Marca',
				nombre: 'g',
				opciones: OPCIONES,
				get valores() {
					return actual;
				},
				set valores(v: string[]) {
					actual = v;
					setter(v);
				}
			}
		});
		flushSync();
		const checks = document.body.querySelectorAll(
			'input[type="checkbox"]'
		) as NodeListOf<HTMLInputElement>;
		checks[0].dispatchEvent(new Event('change', { bubbles: true }));
		expect(setter.mock.calls[0]?.[0]).toEqual(['b']);
	});

	it('asocia aria-describedby al mensaje de error cuando hay error', () => {
		instancia = mount(GrupoSeleccionMultiple, {
			target: document.body,
			props: {
				leyenda: 'Marca',
				nombre: 'g',
				opciones: OPCIONES,
				valores: [],
				error: 'Falta',
				id: 'grupo-y'
			}
		});
		flushSync();
		const fieldset = document.body.querySelector('fieldset');
		expect(fieldset?.getAttribute('aria-describedby')).toBe('grupo-y-error');
		const mensaje = document.body.querySelector('#grupo-y-error');
		expect(mensaje?.textContent).toBe('Falta');
		expect(mensaje?.getAttribute('role')).toBe('alert');
	});
});
