// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import type { DescripcionPropioceptiva } from '$lib/motor/schema';
import DescripcionEjercicio from './DescripcionEjercicio.svelte';

// Datos minimos: solo importa la FORMA (cuantas listas/secciones), no el
// copy. El total de items (9) sirve para confirmar que toda seccion
// renderiza, sin fijar texto de los datos.
const descripcion: DescripcionPropioceptiva = {
	posicion_inicial: ['p1', 'p2'],
	ejecucion: ['e1', 'e2', 'e3'],
	referencias_propioceptivas: ['r1', 'r2'],
	errores_comunes: ['x1', 'x2'],
};

describe('DescripcionEjercicio', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('sin plegarClaves: 4 secciones planas, sin <details>', () => {
		instancia = mount(DescripcionEjercicio, {
			target: document.body,
			props: { descripcion },
		});
		flushSync();

		expect(document.querySelector('details')).toBeNull();
		// Posicion inicial + Ejecucion + Referencias + Errores.
		expect(document.querySelectorAll('h3').length).toBe(4);
		expect(document.querySelectorAll('li').length).toBe(9);
	});

	it('con plegarClaves: referencias y errores dentro del details, posicion y ejecucion fuera', () => {
		instancia = mount(DescripcionEjercicio, {
			target: document.body,
			props: { descripcion, plegarClaves: true },
		});
		flushSync();

		const details = document.querySelector('details');
		expect(details).not.toBeNull();

		const todas = Array.from(document.querySelectorAll('h3'));
		expect(todas.length).toBe(4);

		const adentro = Array.from(details!.querySelectorAll('h3'));
		const afuera = todas.filter((h) => !details!.contains(h));
		// Solo las dos ultimas secciones (referencias, errores) se pliegan.
		expect(adentro.length).toBe(2);
		expect(afuera.length).toBe(2);

		// Todo el contenido sigue presente: nada se pierde al plegar.
		expect(document.querySelectorAll('li').length).toBe(9);
	});

	it('el details usa solo la clase "desplegable" y el summary con el texto de contrato', () => {
		instancia = mount(DescripcionEjercicio, {
			target: document.body,
			props: { descripcion, plegarClaves: true },
		});
		flushSync();

		const details = document.querySelector('details')!;
		expect(details.className).toBe('desplegable');

		const summary = details.querySelector('summary');
		expect(summary).not.toBeNull();
		expect(summary!.textContent).toBe('Claves de forma y errores comunes');
	});
});
