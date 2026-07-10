// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	enfocarPrincipal,
	obtenerSupresionAnuncioDeRuta,
	consumirSupresionAnuncioDeRuta,
	resetearSupresionAnuncioDeRuta,
} from './foco';

describe('enfocarPrincipal', () => {
	it('llama focus() exactamente una vez en un HTMLElement valido', () => {
		const element = document.createElement('h1');
		const spy = vi.spyOn(element, 'focus');

		enfocarPrincipal(element);

		expect(spy).toHaveBeenCalledOnce();
	});

	it('no lanza error si ref es null', () => {
		expect(() => enfocarPrincipal(null)).not.toThrow();
	});

	it('no lanza error si ref es undefined', () => {
		expect(() => enfocarPrincipal(undefined)).not.toThrow();
	});
});

describe('suprimirProximoAnuncioDeRuta', () => {
	beforeEach(() => {
		resetearSupresionAnuncioDeRuta();
	});

	it('se inicializa en false', () => {
		expect(obtenerSupresionAnuncioDeRuta()).toBe(false);
	});

	it('se activa al enfocar un h1 valido', () => {
		const element = document.createElement('h1');
		enfocarPrincipal(element);

		expect(obtenerSupresionAnuncioDeRuta()).toBe(true);
	});

	it('no se activa con ref null', () => {
		enfocarPrincipal(null);

		expect(obtenerSupresionAnuncioDeRuta()).toBe(false);
	});

	it('no se activa con ref undefined', () => {
		enfocarPrincipal(undefined);

		expect(obtenerSupresionAnuncioDeRuta()).toBe(false);
	});
});

describe('consumirSupresionAnuncioDeRuta', () => {
	beforeEach(() => {
		resetearSupresionAnuncioDeRuta();
	});

	it('retorna false cuando la bandera esta desactivada', () => {
		expect(consumirSupresionAnuncioDeRuta()).toBe(false);
	});

	it('retorna true una vez y luego false (one-shot)', () => {
		const element = document.createElement('h1');
		enfocarPrincipal(element);

		expect(consumirSupresionAnuncioDeRuta()).toBe(true);
		expect(consumirSupresionAnuncioDeRuta()).toBe(false);
	});
});