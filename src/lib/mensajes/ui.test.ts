import { describe, it, expect } from 'vitest';
import { M } from './ui';

describe('M.sesion.objetivo — camino isometrico', () => {
	// Para isometrico el margen RIR no aplica: se muestra solo
	// "Sostén X segundos" sin la parte del margen.
	it('isometrico: omite el margen y dice "Sostén 30 segundos"', () => {
		const resultado = M.sesion.objetivo(30, 'segundos', 2);
		expect(resultado).toBe('Sostén 30 segundos.');
		expect(resultado).not.toContain('más');
	});

	it('isometrico: formatea como tiempo si supera 60s', () => {
		const resultado = M.sesion.objetivo(90, 'segundos', 2);
		expect(resultado).toBe('Sostén 1 minuto 30 segundos.');
	});
});
