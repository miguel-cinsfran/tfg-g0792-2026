// @vitest-environment node

import { describe, it, expect } from 'vitest';
import type { Consejo } from './datos';
import { elegirConsejo } from './seleccion';

// Pool sintetico para probar la regla sin tocar el pool real del modulo.
const poolDePrueba: Consejo[] = [
	{ id: 'A', familia: 'tecnica', texto: 'prueba A' },
	{ id: 'B', familia: 'uso_app', texto: 'prueba B' },
	{ id: 'C', familia: 'tecnica', texto: 'prueba C' },
];

describe('elegirConsejo', () => {
	it('sin mostrados devuelve el primer id del pool', () => {
		expect(elegirConsejo([], { pool: poolDePrueba })).toBe('A');
	});

	it('no repite hasta agotar el pool', () => {
		expect(elegirConsejo(['A', 'B'], { pool: poolDePrueba })).toBe('C');
	});

	it('al agotarse el pool, reinicia y devuelve el primer elegible', () => {
		expect(elegirConsejo(['A', 'B', 'C'], { pool: poolDePrueba })).toBe('A');
		// Tras el reinicio, el id elegido pasa a mostrados y la regla sigue.
		expect(elegirConsejo(['A'], { pool: poolDePrueba })).toBe('B');
	});

	it('es determinista: mismos argumentos, mismo resultado', () => {
		const mostrados = ['B'];
		expect(elegirConsejo(mostrados, { pool: poolDePrueba })).toBe(elegirConsejo(mostrados, { pool: poolDePrueba }));
	});

	it('el filtro por familia acota el conjunto elegible sin cambiar la regla', () => {
		expect(elegirConsejo([], { pool: poolDePrueba, familia: 'uso_app' })).toBe('B');
		// Un id mostrado de otra familia no consume turnos dentro de la familia.
		expect(elegirConsejo(['B'], { pool: poolDePrueba, familia: 'tecnica' })).toBe('A');
		// Dentro de la familia, al agotarse reinicia.
		expect(elegirConsejo(['A', 'C'], { pool: poolDePrueba, familia: 'tecnica' })).toBe('A');
	});
});
