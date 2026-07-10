import { describe, it, expect } from 'vitest';
import { crearError } from './crear';

describe('crearError', () => {
	it('crea un Error con code string', () => {
		const err = crearError('ERR-DB-WRITE');
		expect(err).toBeInstanceOf(Error);
		expect((err as Error & { code: string }).code).toBe('ERR-DB-WRITE');
	});

	it('usa code como mensaje si no se pasa mensaje', () => {
		const err = crearError('ERR-BOOT-DEXIE');
		expect(err.message).toBe('ERR-BOOT-DEXIE');
	});

	it('usa el mensaje provisto si se pasa', () => {
		const err = crearError('ERR-DB-WRITE', 'No se pudo guardar');
		expect(err.message).toBe('No se pudo guardar');
	});

	it('asigna causa si se provee', () => {
		const causa = new Error('base corrupta');
		const err = crearError('ERR-BOOT-DEXIE', 'Fallo al abrir DB', causa);
		expect((err as Error & { causa: unknown }).causa).toBe(causa);
	});

	it('omite causa si no se provee', () => {
		const err = crearError('ERR-DB-WRITE', 'mensaje');
		expect((err as { causa?: unknown }).causa).toBeUndefined();
	});
});
