import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registrarVolver, quitarVolver, obtenerVolver, reiniciarVolver } from './atras-pantalla';

describe('registro del atras de pantalla', () => {
	beforeEach(() => {
		reiniciarVolver();
	});

	it('sin nada registrado no hay manejador', () => {
		expect(obtenerVolver()).toBeNull();
	});

	it('registrar expone el manejador y quitarlo lo saca', () => {
		const manejar = vi.fn();
		registrarVolver(manejar);
		expect(obtenerVolver()).toBe(manejar);
		quitarVolver(manejar);
		expect(obtenerVolver()).toBeNull();
	});

	it('con dos registrados manda el ultimo; al quitarlo vuelve el primero', () => {
		const primero = vi.fn();
		const segundo = vi.fn();
		registrarVolver(primero);
		registrarVolver(segundo);
		expect(obtenerVolver()).toBe(segundo);
		quitarVolver(segundo);
		expect(obtenerVolver()).toBe(primero);
	});

	it('quitar uno que no esta no toca al resto', () => {
		const dentro = vi.fn();
		registrarVolver(dentro);
		quitarVolver(vi.fn());
		expect(obtenerVolver()).toBe(dentro);
	});
});
