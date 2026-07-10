import { describe, it, expect } from 'vitest';
import { CatalogoSchema } from './schema';
import { popularCatalogo } from './cargar';
import { ZodError } from 'zod';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };

const ejercicioMinimo = {
	id: 'test-001',
	nombre: 'Test',
	patron: 'PUSH_H' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['hombros' as const],
	reps_iniciales: 10,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

function capturarError(fn: () => void): Error & { code: string; causa: unknown } {
	try {
		fn();
		throw new Error('Se esperaba un error');
	} catch (e) {
		return e as Error & { code: string; causa: unknown };
	}
}

describe('Smoke tests contra JSON real', () => {
	it('catálogo real valida contra CatalogoSchema', () => {
		expect(() => CatalogoSchema.parse(catalogoRaw)).not.toThrow();
	});
});

describe('popularCatalogo', () => {
	it('objeto válido no lanza', () => {
		expect(() =>
			popularCatalogo({ ejercicios: [ejercicioMinimo] }),
		).not.toThrow();
	});

	it('patron inválido lanza ERR-BOOT-CATALOGO con ZodError', () => {
		const invalido = { ...ejercicioMinimo, patron: 'INVALIDO' };
		const err = capturarError(() =>
			popularCatalogo({ ejercicios: [invalido] }),
		);
		expect(err.code).toBe('ERR-BOOT-CATALOGO');
		expect(err.causa).toBeInstanceOf(ZodError);
		const zodErr = err.causa as ZodError;
		expect(zodErr.issues[0].path).toContain('patron');
	});

	it('campo requerido ausente lanza ERR-BOOT-CATALOGO', () => {
		const sinNombre = { ...ejercicioMinimo, nombre: undefined };
		const err = capturarError(() =>
			popularCatalogo({ ejercicios: [sinNombre] }),
		);
		expect(err.code).toBe('ERR-BOOT-CATALOGO');
		expect(err.causa).toBeInstanceOf(ZodError);
		const zodErr = err.causa as ZodError;
		expect(zodErr.issues[0].path).toContain('nombre');
	});
});