import { describe, it, expect } from 'vitest';
import { calcularImc } from './imc';

describe('calcularImc', () => {
	it('peso y altura tipicos dan valor y categoria "normal"', () => {
		const r = calcularImc(70, 175);
		expect(r).not.toBeNull();
		expect(r!.valor).toBe(22.9);
		expect(r!.categoria).toBe('normal');
	});

	it('peso bajo se categoriza como bajo_peso', () => {
		const r = calcularImc(50, 175);
		expect(r).not.toBeNull();
		expect(r!.categoria).toBe('bajo_peso');
	});

	it('peso alto se categoriza como sobrepeso', () => {
		const r = calcularImc(85, 175);
		expect(r).not.toBeNull();
		expect(r!.categoria).toBe('sobrepeso');
	});

	it('peso muy alto se categoriza como obesidad', () => {
		const r = calcularImc(100, 175);
		expect(r).not.toBeNull();
		expect(r!.categoria).toBe('obesidad');
	});

	it('IMC exactamente 18.5 cuenta como normal (limite inclusivo)', () => {
		// 18.5 * (1.75^2) = 18.5 * 3.0625 = 56.65625
		const r = calcularImc(56.65625, 175);
		expect(r).not.toBeNull();
		expect(r!.valor).toBe(18.5);
		expect(r!.categoria).toBe('normal');
	});

	it('IMC exactamente 25 cuenta como sobrepeso (limite inclusivo)', () => {
		// 25 * (1.75^2) = 25 * 3.0625 = 76.5625
		const r = calcularImc(76.5625, 175);
		expect(r).not.toBeNull();
		expect(r!.valor).toBe(25);
		expect(r!.categoria).toBe('sobrepeso');
	});

	it('IMC exactamente 30 cuenta como obesidad (limite inclusivo)', () => {
		// 30 * (1.75^2) = 30 * 3.0625 = 91.875
		const r = calcularImc(91.875, 175);
		expect(r).not.toBeNull();
		expect(r!.valor).toBe(30);
		expect(r!.categoria).toBe('obesidad');
	});

	it('sin altura devuelve null', () => {
		expect(calcularImc(70, undefined)).toBeNull();
	});

	it('con altura 0 devuelve null', () => {
		expect(calcularImc(70, 0)).toBeNull();
	});

	it('con altura negativa devuelve null', () => {
		expect(calcularImc(70, -175)).toBeNull();
	});
});
