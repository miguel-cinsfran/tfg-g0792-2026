// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	enfocarPrincipal,
	obtenerSupresionAnuncioDeRuta,
	consumirSupresionAnuncioDeRuta,
	resetearSupresionAnuncioDeRuta,
	reaplicarFocoPendiente,
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

describe('reaplicarFocoPendiente', () => {
	beforeEach(() => {
		resetearSupresionAnuncioDeRuta();
		document.body.innerHTML = '';
		// Drena el pendiente que un test anterior pudo dejar sin consumir:
		// sin pendiente reaplicar es inofensivo y devuelve true.
		reaplicarFocoPendiente();
	});

	function h1EnElDocumento(): HTMLHeadingElement {
		const h1 = document.createElement('h1');
		h1.tabIndex = -1;
		document.body.appendChild(h1);
		return h1;
	}

	it('si el robo dejo el foco en el body, lo devuelve al h1 y retorna true', () => {
		const h1 = h1EnElDocumento();
		enfocarPrincipal(h1);
		// reset_focus de SvelteKit deja el foco en el body. En jsdom un
		// body.focus() no le gana a un elemento ya enfocado; blur llega al
		// mismo estado: activeElement === body.
		h1.blur();
		expect(document.activeElement).toBe(document.body);

		expect(reaplicarFocoPendiente()).toBe(true);
		expect(document.activeElement).toBe(h1);
	});

	it('si el h1 ya no esta en el documento, no mueve el foco y retorna false', () => {
		const h1 = h1EnElDocumento();
		enfocarPrincipal(h1);
		h1.blur();
		h1.remove();

		expect(reaplicarFocoPendiente()).toBe(false);
		expect(document.activeElement).toBe(document.body);
	});

	it('si la persona movio el foco a otro control, lo respeta y retorna true', () => {
		const h1 = h1EnElDocumento();
		const boton = document.createElement('button');
		document.body.appendChild(boton);
		enfocarPrincipal(h1);
		boton.focus();

		expect(reaplicarFocoPendiente()).toBe(true);
		expect(document.activeElement).toBe(boton);
	});
});
