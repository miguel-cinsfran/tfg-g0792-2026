// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	consejosActivados,
	establecerConsejosActivados,
	anuncioConsejoActivado,
	establecerAnuncioConsejoActivado,
	leerMostrados,
	guardarMostrados,
	incrementarContadorArranques,
	leerContadorArranques,
} from './preferencias';

beforeEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe('defaults de las preferencias', () => {
	it('sin preferencia guardada, consejosActivados devuelve true', () => {
		expect(consejosActivados()).toBe(true);
	});

	it('sin preferencia guardada, anuncioConsejoActivado devuelve true', () => {
		expect(anuncioConsejoActivado()).toBe(true);
	});
});

describe('persistencia de las preferencias', () => {
	it('con "1" guardado devuelve true para ambas', () => {
		localStorage.setItem('consejos-activados', '1');
		localStorage.setItem('consejos-anunciar', '1');
		expect(consejosActivados()).toBe(true);
		expect(anuncioConsejoActivado()).toBe(true);
	});

	it('con "0" guardado devuelve false para ambas', () => {
		localStorage.setItem('consejos-activados', '0');
		localStorage.setItem('consejos-anunciar', '0');
		expect(consejosActivados()).toBe(false);
		expect(anuncioConsejoActivado()).toBe(false);
	});

	it('establecer* persiste el valor en ambas claves', () => {
		establecerConsejosActivados(false);
		expect(localStorage.getItem('consejos-activados')).toBe('0');
		expect(consejosActivados()).toBe(false);
		establecerConsejosActivados(true);
		expect(localStorage.getItem('consejos-activados')).toBe('1');
		expect(consejosActivados()).toBe(true);

		establecerAnuncioConsejoActivado(false);
		expect(localStorage.getItem('consejos-anunciar')).toBe('0');
		expect(anuncioConsejoActivado()).toBe(false);
		establecerAnuncioConsejoActivado(true);
		expect(localStorage.getItem('consejos-anunciar')).toBe('1');
		expect(anuncioConsejoActivado()).toBe(true);
	});
});

describe('pool de mostrados', () => {
	it('leerMostrados sin clave devuelve []', () => {
		expect(leerMostrados()).toEqual([]);
	});

	it('leerMostrados con JSON invalido devuelve []', () => {
		localStorage.setItem('consejos-mostrados', 'no-es-json');
		expect(leerMostrados()).toEqual([]);
	});

	it('leerMostrados con JSON que no es array devuelve []', () => {
		localStorage.setItem('consejos-mostrados', '{"a":1}');
		expect(leerMostrados()).toEqual([]);
	});

	it('guardarMostrados persiste y leerMostrados recupera los ids', () => {
		guardarMostrados(['tec-01', 'uso-02']);
		expect(leerMostrados()).toEqual(['tec-01', 'uso-02']);
	});
});

describe('conteo de arranques', () => {
	it('incrementarContadorArranques devuelve 1 la primera vez y 2 la segunda', () => {
		expect(incrementarContadorArranques()).toBe(1);
		expect(incrementarContadorArranques()).toBe(2);
	});

	it('incrementarContadorArranques persiste el nuevo valor', () => {
		incrementarContadorArranques();
		expect(localStorage.getItem('consejos-arranques')).toBe('1');
	});

	it('leerContadorArranques sin clave devuelve 0', () => {
		expect(leerContadorArranques()).toBe(0);
	});

	it('leerContadorArranques con valor invalido devuelve 0', () => {
		localStorage.setItem('consejos-arranques', 'abc');
		expect(leerContadorArranques()).toBe(0);
		localStorage.setItem('consejos-arranques', '2.5');
		expect(leerContadorArranques()).toBe(0);
	});
});

describe('contrato "nunca lanza"', () => {
	it('error de lectura devuelve el default de cada funcion', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('boom');
		});
		expect(() => consejosActivados()).not.toThrow();
		expect(consejosActivados()).toBe(true);
		expect(() => anuncioConsejoActivado()).not.toThrow();
		expect(anuncioConsejoActivado()).toBe(true);
		expect(() => leerMostrados()).not.toThrow();
		expect(leerMostrados()).toEqual([]);
		expect(() => leerContadorArranques()).not.toThrow();
		expect(leerContadorArranques()).toBe(0);
		expect(() => incrementarContadorArranques()).not.toThrow();
		expect(incrementarContadorArranques()).toBe(0);
	});

	it('error de escritura no lanza', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('boom');
		});
		expect(() => establecerConsejosActivados(true)).not.toThrow();
		expect(() => establecerAnuncioConsejoActivado(false)).not.toThrow();
		expect(() => guardarMostrados(['tec-01'])).not.toThrow();
		expect(() => incrementarContadorArranques()).not.toThrow();
		expect(incrementarContadorArranques()).toBe(0);
	});
});
