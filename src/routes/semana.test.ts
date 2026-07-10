import { describe, it, expect } from 'vitest';
import { numeroSemana } from './semana';

describe('numeroSemana', () => {
	it('cuenta la primera semana como 1 (no 0)', () => {
		const primera = 1_700_000_000_000;
		expect(numeroSemana(primera, primera)).toBe(1);
		expect(numeroSemana(primera, primera + 1)).toBe(1);
	});

	it('avanza una semana completa (7 dias exactos)', () => {
		const primera = 0;
		const sieteDias = 7 * 86_400_000;
		expect(numeroSemana(primera, sieteDias)).toBe(2);
	});

	it('redondea hacia abajo dentro de la semana', () => {
		const primera = 0;
		const seisDiasMenosUno = 6 * 86_400_000 - 1;
		expect(numeroSemana(primera, seisDiasMenosUno)).toBe(1);
	});

	it('cuenta correctamente varias semanas', () => {
		const primera = 0;
		expect(numeroSemana(primera, 14 * 86_400_000)).toBe(3);
		expect(numeroSemana(primera, 30 * 86_400_000)).toBe(5);
	});
});
