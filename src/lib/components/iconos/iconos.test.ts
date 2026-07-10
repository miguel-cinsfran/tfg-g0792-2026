// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Reloj from './Reloj.svelte';
import Cronometro from './Cronometro.svelte';
import FlechaDerecha from './FlechaDerecha.svelte';

describe.each([
	['Reloj', Reloj],
	['Cronometro', Cronometro],
	['FlechaDerecha', FlechaDerecha],
])('icono %s', (_nombre, Componente) => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) {
			unmount(instancia);
		}
	});

	it('renderiza svg con aria-hidden', () => {
		instancia = mount(Componente, { target: document.body });
		flushSync();
		const svg = document.body.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	it('aplica tamano y clase personalizados', () => {
		instancia = mount(Componente, {
			target: document.body,
			props: { tamano: 32, clase: 'mi-clase' },
		});
		flushSync();
		const svg = document.body.querySelector('svg')!;
		expect(svg.getAttribute('width')).toBe('32');
		expect(svg.getAttribute('height')).toBe('32');
		expect(svg.classList.contains('mi-clase')).toBe(true);
	});
});