import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Verificacion matematica WCAG 2.2 de los tokens de color de app.css.
// Si un cambio de paleta rompe un par, este test falla ANTES de que
// llegue a una pantalla.

const css = readFileSync(new URL('../../app.css', import.meta.url), 'utf-8');

function token(nombre: string): string {
	const m = css.match(new RegExp(`--color-${nombre}:\\s*(#[0-9a-fA-F]{6})`));
	if (!m) throw new Error(`token --color-${nombre} no encontrado en app.css`);
	return m[1];
}

function luminancia(hex: string): number {
	const canal = (c: number): number => {
		const s = c / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string, b: string): number {
	const la = luminancia(a);
	const lb = luminancia(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const superficies = ['surface', 'surface-alt', 'surface-raised'] as const;

describe('contraste WCAG 2.2 AA de los tokens', () => {
	// Texto (1.4.3): minimo 4.5:1 sobre cada superficie donde puede aparecer
	const textos = ['text-primary', 'text-secondary', 'acento', 'error', 'success', 'warning', 'naranja'];
	for (const fg of textos) {
		for (const bg of superficies) {
			it(`${fg} sobre ${bg} >= 4.5:1`, () => {
				expect(contraste(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
			});
		}
	}

	// Boton primario: texto oscuro (surface) sobre acento y su hover
	it('surface sobre acento >= 4.5:1 (texto de boton primario)', () => {
		expect(contraste(token('surface'), token('acento'))).toBeGreaterThanOrEqual(4.5);
	});
	it('surface sobre acento-hover >= 4.5:1', () => {
		expect(contraste(token('surface'), token('acento-hover'))).toBeGreaterThanOrEqual(4.5);
	});

	// No-texto (1.4.11): minimo 3:1 para limites de componentes interactivos
	// (border-strong) y para el anillo de foco (acento) sobre cada superficie
	for (const bg of superficies) {
		it(`border-strong sobre ${bg} >= 3:1 (limite interactivo)`, () => {
			expect(contraste(token('border-strong'), token(bg))).toBeGreaterThanOrEqual(3);
		});
		it(`acento sobre ${bg} >= 3:1 (anillo de foco)`, () => {
			expect(contraste(token('acento'), token(bg))).toBeGreaterThanOrEqual(3);
		});
	}
});
