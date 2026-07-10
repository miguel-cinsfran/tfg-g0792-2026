// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
	volumenAPorcentaje,
	porcentajeAVolumen,
	formatoPorcentaje
} from './volumen';

describe('volumenAPorcentaje', () => {
	it('mapea 0 a 0', () => {
		expect(volumenAPorcentaje(0)).toBe(0);
	});

	it('mapea 1 a 100', () => {
		expect(volumenAPorcentaje(1)).toBe(100);
	});

	it('redondea 0.5 a 50', () => {
		expect(volumenAPorcentaje(0.5)).toBe(50);
	});

	it('redondea 0.333 a 33 (no 34)', () => {
		expect(volumenAPorcentaje(1 / 3)).toBe(33);
	});

	it('clampa fuera de rango por encima', () => {
		expect(volumenAPorcentaje(1.5)).toBe(100);
	});

	it('clampa fuera de rango por debajo', () => {
		expect(volumenAPorcentaje(-0.2)).toBe(0);
	});

	it('basura no-numerica cae a 0', () => {
		expect(volumenAPorcentaje(Number.NaN)).toBe(0);
		expect(volumenAPorcentaje(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

describe('porcentajeAVolumen', () => {
	it('mapea 0 a 0', () => {
		expect(porcentajeAVolumen(0)).toBe(0);
	});

	it('mapea 100 a 1', () => {
		expect(porcentajeAVolumen(100)).toBe(1);
	});

	it('mapea 50 a 0.5 sin redondear', () => {
		expect(porcentajeAVolumen(50)).toBe(0.5);
	});

	it('mapea 33 a 0.33 (fiel al gesto del usuario)', () => {
		expect(porcentajeAVolumen(33)).toBeCloseTo(0.33, 10);
	});

	it('clampa fuera de rango por encima', () => {
		expect(porcentajeAVolumen(150)).toBe(1);
	});

	it('clampa fuera de rango por debajo', () => {
		expect(porcentajeAVolumen(-10)).toBe(0);
	});

	it('basura no-numerica cae a 0', () => {
		expect(porcentajeAVolumen(Number.NaN)).toBe(0);
	});
});

describe('formatoPorcentaje', () => {
	it('anuncia 0 como "0 por ciento"', () => {
		expect(formatoPorcentaje(0)).toBe('0 por ciento');
	});

	it('anuncia 50 como "50 por ciento"', () => {
		expect(formatoPorcentaje(50)).toBe('50 por ciento');
	});

	it('anuncia 100 como "100 por ciento"', () => {
		expect(formatoPorcentaje(100)).toBe('100 por ciento');
	});

	it('redondea y clampa valores del deslizador', () => {
		expect(formatoPorcentaje(49.6)).toBe('50 por ciento');
		expect(formatoPorcentaje(-5)).toBe('0 por ciento');
		expect(formatoPorcentaje(150)).toBe('100 por ciento');
	});
});
