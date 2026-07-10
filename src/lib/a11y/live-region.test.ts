// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { anunciarPolite, anunciarAssertive } from './live-region';

beforeEach(() => {
	document.body.innerHTML = '';
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('anunciarPolite', () => {
	it('escribe mensaje en #live-polite', () => {
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		anunciarPolite('Serie completada');
		vi.advanceTimersByTime(50);

		expect(region.textContent).toBe('Serie completada');
	});

	it('no lanza error si #live-polite no existe', () => {
		expect(() => anunciarPolite('mensaje')).not.toThrow();
	});
});

describe('anunciarAssertive', () => {
	it('escribe mensaje en #live-assertive', () => {
		const region = document.createElement('div');
		region.id = 'live-assertive';
		document.body.appendChild(region);

		anunciarAssertive('Error de conexión');
		vi.advanceTimersByTime(50);

		expect(region.textContent).toBe('Error de conexión');
	});

	it('no lanza error si #live-assertive no existe', () => {
		expect(() => anunciarAssertive('mensaje')).not.toThrow();
	});
});

describe('limpieza automatica', () => {
	it('borra el mensaje 10 segundos despues de anunciarlo', () => {
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		anunciarPolite('Serie completada');
		vi.advanceTimersByTime(50);
		expect(region.textContent).toBe('Serie completada');

		vi.advanceTimersByTime(10_000);
		expect(region.textContent).toBe('');
	});

	it('un anuncio nuevo cancela la limpieza pendiente del anterior', () => {
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		anunciarPolite('Primero');
		vi.advanceTimersByTime(9_000);
		anunciarPolite('Segundo');
		vi.advanceTimersByTime(2_000);
		// La limpieza del primero (a los 10s de aquel) no debe borrar al segundo.
		expect(region.textContent).toBe('Segundo');
	});
});

describe('clear-rewrite yield', () => {
	it('limpia antes de reescribir con setTimeout(50ms)', () => {
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		// Primera llamada: escribe tras 50ms
		anunciarPolite('Listo');
		vi.advanceTimersByTime(50);
		expect(region.textContent).toBe('Listo');

		// Segunda llamada: limpia inmediatamente, reescribe tras 50ms
		anunciarPolite('Listo');
		expect(region.textContent).toBe('');
		vi.advanceTimersByTime(50);
		expect(region.textContent).toBe('Listo');
	});
});