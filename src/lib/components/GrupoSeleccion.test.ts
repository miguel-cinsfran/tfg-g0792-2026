// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import GrupoSeleccion from './GrupoSeleccion.svelte';

describe('GrupoSeleccion', () => {
	let instancia: ReturnType<typeof mount>;

	const OPCIONES = [
		{ valor: 'a', etiqueta: 'A', descripcion: 'primera' },
		{ valor: 'b', etiqueta: 'B' }
	];

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('renderiza legend y un radio por opcion', () => {
		instancia = mount(GrupoSeleccion, {
			target: document.body,
			props: { leyenda: 'Elige', nombre: 'g', opciones: OPCIONES, valor: null }
		});
		flushSync();
		expect(document.body.querySelector('legend')?.textContent).toBe('Elige');
		const radios = document.body.querySelectorAll('input[type="radio"]');
		expect(radios).toHaveLength(2);
	});

	it('marca checked el radio cuyo valor coincide', () => {
		instancia = mount(GrupoSeleccion, {
			target: document.body,
			props: { leyenda: 'Elige', nombre: 'g', opciones: OPCIONES, valor: 'b' }
		});
		flushSync();
		const radios = document.body.querySelectorAll(
			'input[type="radio"]'
		) as NodeListOf<HTMLInputElement>;
		expect(radios[0].checked).toBe(false);
		expect(radios[1].checked).toBe(true);
	});

	it('al cambiar un radio, invoca el setter del bindable con el valor elegido', () => {
		const setter = vi.fn();
		let actual: string | null = null;
		instancia = mount(GrupoSeleccion, {
			target: document.body,
			props: {
				leyenda: 'Elige',
				nombre: 'g',
				opciones: OPCIONES,
				get valor() {
					return actual;
				},
				set valor(v: string | null) {
					actual = v;
					setter(v);
				}
			}
		});
		flushSync();
		const radios = document.body.querySelectorAll(
			'input[type="radio"]'
		) as NodeListOf<HTMLInputElement>;
		radios[1].dispatchEvent(new Event('change', { bubbles: true }));
		expect(setter).toHaveBeenCalledWith('b');
	});

	it('muestra el mensaje de error y asocia aria-describedby cuando hay error', () => {
		instancia = mount(GrupoSeleccion, {
			target: document.body,
			props: {
				leyenda: 'Elige',
				nombre: 'g',
				opciones: OPCIONES,
				valor: null,
				error: 'Falta elegir',
				id: 'grupo-x'
			}
		});
		flushSync();
		const fieldset = document.body.querySelector('fieldset');
		expect(fieldset?.getAttribute('aria-describedby')).toBe('grupo-x-error');
		const mensaje = document.body.querySelector('#grupo-x-error');
		expect(mensaje?.textContent).toBe('Falta elegir');
		expect(mensaje?.getAttribute('role')).toBe('alert');
	});

	it('sin error, no expone aria-describedby', () => {
		instancia = mount(GrupoSeleccion, {
			target: document.body,
			props: { leyenda: 'Elige', nombre: 'g', opciones: OPCIONES, valor: null }
		});
		flushSync();
		const fieldset = document.body.querySelector('fieldset');
		expect(fieldset?.hasAttribute('aria-describedby')).toBe(false);
	});
});
