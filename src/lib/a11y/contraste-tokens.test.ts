import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Verificacion matematica WCAG 2.2 de los tokens de color de app.css.
// El claro vive en el @theme; el oscuro y el contraste redefinen los
// MISMOS tokens bajo :root[data-tema]. Si un cambio de paleta rompe
// un par, este test falla ANTES de que llegue a una pantalla.

const css = readFileSync(new URL('../../app.css', import.meta.url), 'utf-8');

type Tema = 'claro' | 'oscuro' | 'contraste';

function bloqueDe(tema: Tema): string {
	if (tema === 'claro') {
		const m = css.match(/@theme\s*\{([\s\S]*?)\}/);
		if (!m) throw new Error('bloque @theme no encontrado en app.css');
		return m[1];
	}
	const m = css.match(new RegExp(`:root\\[data-tema="${tema}"\\]\\s*\\{([\\s\\S]*?)\\}`));
	if (!m) throw new Error(`bloque :root[data-tema="${tema}"] no encontrado en app.css`);
	return m[1];
}

const BLOQUES: Record<Tema, string> = {
	claro: bloqueDe('claro'),
	oscuro: bloqueDe('oscuro'),
	contraste: bloqueDe('contraste'),
};

function token(tema: Tema, nombre: string): string {
	const m = BLOQUES[tema].match(new RegExp(`--color-${nombre}:\\s*(#[0-9a-fA-F]{6}|transparent)`));
	if (!m) throw new Error(`token --color-${nombre} no encontrado en el tema ${tema} de app.css`);
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
// Texto (1.4.3) en cada tema: minimo 4.5:1 sobre cada superficie
const textos = ['text-primary', 'text-secondary', 'acento', 'error', 'success', 'warning', 'naranja'];

const TEMAS: Tema[] = ['claro', 'oscuro', 'contraste'];

describe('borde de bloque por tema', () => {
	it('claro y oscuro lo dejan invisible, contraste lo pinta blanco', () => {
		expect(token('claro', 'borde-bloque')).toBe('transparent');
		expect(token('oscuro', 'borde-bloque')).toBe('transparent');
		expect(token('contraste', 'borde-bloque').toLowerCase()).toBe('#ffffff');
	});
});

for (const tema of TEMAS) {
	describe(`contraste WCAG 2.2 AA del tema ${tema}`, () => {
		for (const fg of textos) {
			for (const bg of superficies) {
				it(`${fg} sobre ${bg} >= 4.5:1`, () => {
					expect(contraste(token(tema, fg), token(tema, bg))).toBeGreaterThanOrEqual(4.5);
				});
			}
		}

		// Boton primario: texto oscuro (sobre-accion) sobre accion y su hover
		it('sobre-accion sobre accion >= 4.5:1 (texto de boton primario)', () => {
			expect(contraste(token(tema, 'sobre-accion'), token(tema, 'accion'))).toBeGreaterThanOrEqual(4.5);
		});
		it('sobre-accion sobre accion-hover >= 4.5:1', () => {
			expect(contraste(token(tema, 'sobre-accion'), token(tema, 'accion-hover'))).toBeGreaterThanOrEqual(4.5);
		});

		// No-texto (1.4.11): minimo 3:1 para limites de componentes
		// interactivos (border-strong) y para el anillo de foco (acento)
		for (const bg of superficies) {
			it(`border-strong sobre ${bg} >= 3:1 (limite interactivo)`, () => {
				expect(contraste(token(tema, 'border-strong'), token(tema, bg))).toBeGreaterThanOrEqual(3);
			});
			it(`acento sobre ${bg} >= 3:1 (anillo de foco)`, () => {
				expect(contraste(token(tema, 'acento'), token(tema, bg))).toBeGreaterThanOrEqual(3);
			});
			it(`accion-borde sobre ${bg} >= 3:1 (delimita el boton primario)`, () => {
				expect(contraste(token(tema, 'accion-borde'), token(tema, bg))).toBeGreaterThanOrEqual(3);
			});
		}
	});
}

// Alto contraste para baja vision severa: todo texto a 7:1 o mas.
describe('contraste AAA del tema contraste (7:1)', () => {
	for (const fg of textos) {
		for (const bg of superficies) {
			it(`${fg} sobre ${bg} >= 7:1`, () => {
				expect(contraste(token('contraste', fg), token('contraste', bg))).toBeGreaterThanOrEqual(7);
			});
		}
	}

	it('sobre-accion sobre accion >= 7:1 (texto de boton primario)', () => {
		expect(contraste(token('contraste', 'sobre-accion'), token('contraste', 'accion'))).toBeGreaterThanOrEqual(7);
	});
	it('sobre-accion sobre accion-hover >= 7:1', () => {
		expect(contraste(token('contraste', 'sobre-accion'), token('contraste', 'accion-hover'))).toBeGreaterThanOrEqual(7);
	});
});
