import { describe, it, expect } from 'vitest';
import { capitalizar } from './texto';

describe('capitalizar', () => {
	it('sube la primera letra y no toca el resto', () => {
		expect(capitalizar('empuje horizontal')).toBe('Empuje horizontal');
	});

	it('cadena vacia queda vacia', () => {
		expect(capitalizar('')).toBe('');
	});

	it('respeta acentos iniciales', () => {
		expect(capitalizar('índice')).toBe('Índice');
	});
});
