// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CatalogoSchema } from '../catalogo/schema';
import { CONSEJOS } from './datos';

const catalogo = CatalogoSchema.parse(
	JSON.parse(readFileSync(new URL('../../../static/data/catalogo.json', import.meta.url), 'utf8')),
);

const catalogoPorId = new Map(catalogo.ejercicios.map((e) => [e.id, e]));

function textoCompletoDe(ejercicioId: string): string {
	const ejercicio = catalogoPorId.get(ejercicioId);
	if (ejercicio === undefined) {
		throw new Error(`fuente desconocida: ${ejercicioId}`);
	}
	return Object.values(ejercicio.descripcion).flat().join('\n');
}

describe('pool de consejos', () => {
	it('cada consejo de tecnica cita una fuente no vacia', () => {
		for (const consejo of CONSEJOS.filter((c) => c.familia === 'tecnica')) {
			expect(consejo.fuente?.trim() ?? '').not.toBe('');
		}
	});

	it('el texto de cada consejo de tecnica aparece en la descripcion del ejercicio citado', () => {
		for (const consejo of CONSEJOS.filter((c) => c.familia === 'tecnica')) {
			expect(textoCompletoDe(consejo.fuente ?? '')).toContain(consejo.texto);
		}
	});

	it('los ids son unicos y siguen el patron familia-numero', () => {
		const ids = CONSEJOS.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) {
			expect(id).toMatch(/^(tec|uso)-\d+$/);
		}
	});

	it('no hay consejos de salud', () => {
		expect(new Set(CONSEJOS.map((c) => c.familia))).toEqual(new Set(['tecnica', 'uso_app']));
		// Regla dura: la salud queda fuera del pool. La lista es la
		// definicion ejecutable de "contenido de salud" para este pool.
		const terminosDeSalud = ['salud', 'médic', 'doctor', 'lesión', 'rehabilit', 'diagnóstic', 'tratamiento', 'fisioterap'];
		for (const consejo of CONSEJOS) {
			const texto = consejo.texto.toLowerCase();
			for (const termino of terminosDeSalud) {
				expect(texto).not.toContain(termino);
			}
		}
	});
});
