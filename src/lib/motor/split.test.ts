import { describe, it, expect } from 'vitest';
import { elegirSplit, determinarTipoSesion } from './split';
import { sesionBase } from '../../../tests/fixtures/sesion-base';

describe('elegirSplit (ALG-02)', () => {
	it('2 y 3 dias dan FULL_BODY para cualquier nivel', () => {
		expect(elegirSplit(2, 'avanzado')).toEqual({ split: 'FULL_BODY', aviso_limite_dias: false });
		expect(elegirSplit(3, 'principiante')).toEqual({
			split: 'FULL_BODY',
			aviso_limite_dias: false,
		});
	});

	it('4-5 dias con principiante queda en FULL_BODY', () => {
		expect(elegirSplit(4, 'principiante').split).toBe('FULL_BODY');
		expect(elegirSplit(5, 'principiante').split).toBe('FULL_BODY');
	});

	it('4-5 dias con intermedio o avanzado da UPPER_LOWER', () => {
		expect(elegirSplit(4, 'intermedio').split).toBe('UPPER_LOWER');
		expect(elegirSplit(5, 'avanzado').split).toBe('UPPER_LOWER');
	});

	it('6+ dias ajusta a FULL_BODY con aviso de limite', () => {
		expect(elegirSplit(6, 'avanzado')).toEqual({ split: 'FULL_BODY', aviso_limite_dias: true });
	});
});

describe('determinarTipoSesion (ALG-03)', () => {
	it('FULL_BODY siempre da FULL_BODY', () => {
		expect(determinarTipoSesion('FULL_BODY', null)).toBe('FULL_BODY');
		expect(determinarTipoSesion('FULL_BODY', sesionBase({ tipo: 'UPPER' }))).toBe('FULL_BODY');
	});

	it('UPPER_LOWER sin sesion previa arranca en UPPER', () => {
		expect(determinarTipoSesion('UPPER_LOWER', null)).toBe('UPPER');
	});

	it('UPPER_LOWER alterna UPPER y LOWER', () => {
		expect(determinarTipoSesion('UPPER_LOWER', sesionBase({ tipo: 'UPPER' }))).toBe('LOWER');
		expect(determinarTipoSesion('UPPER_LOWER', sesionBase({ tipo: 'LOWER' }))).toBe('UPPER');
	});

	it('tras cambiar de split, una ultima sesion FULL_BODY reinicia el ciclo en UPPER', () => {
		expect(determinarTipoSesion('UPPER_LOWER', sesionBase({ tipo: 'FULL_BODY' }))).toBe('UPPER');
	});
});
