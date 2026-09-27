// @vitest-environment jsdom
//
// El script previo al dibujo de app.html duplica la regla de resolucion
// de aspecto.ts: corre antes del bundle y no puede importarlo. Esta
// prueba ata los dos ejecutando el script en jsdom y comparando el
// data-tema que deja con lo que devuelve resolverTemaAspecto.

import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	aplicarTema,
	leerAspecto,
	resolverTemaAspecto
} from '$lib/aspecto/aspecto';

const html = readFileSync('src/app.html', 'utf-8');

const guiones = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (guiones.length !== 1) {
	throw new Error(
		`app.html debe traer un solo script en linea, hay ${guiones.length}`
	);
}
const guion = guiones[0][1];

// Sin parpadeo: el script pinta antes de que SvelteKit dibuje.
const posicionGuion = html.indexOf('<script>');
const posicionHead = html.indexOf('%sveltekit.head%');
if (posicionGuion > posicionHead) {
	throw new Error(
		'el script previo al dibujo debe ir antes de %sveltekit.head%'
	);
}

function preparar(preferencia: string | null, sistemaEnOscuro: boolean): void {
	localStorage.clear();
	if (preferencia !== null) localStorage.setItem('aspecto', preferencia);
	window.matchMedia = ((consulta: string) => ({
		matches: sistemaEnOscuro,
		media: consulta,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	})) as unknown as typeof window.matchMedia;
	document.documentElement.removeAttribute('data-tema');
	document.head.innerHTML = '<meta name="theme-color" content="#F7F4EE" />';
}

function temaDelGuion(
	preferencia: string | null,
	sistemaEnOscuro: boolean
): string {
	preparar(preferencia, sistemaEnOscuro);
	const esperado = resolverTemaAspecto(leerAspecto(), sistemaEnOscuro);
	new Function(guion)();
	return `${document.documentElement.getAttribute('data-tema')}|${esperado}`;
}

describe('script previo al dibujo de app.html', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute('data-tema');
	});

	it('sistema con telefono en oscuro deja "oscuro"', () => {
		const [puesto, esperado] = temaDelGuion(null, true).split('|');
		expect(esperado).toBe('oscuro');
		expect(puesto).toBe(esperado);
	});

	it('sistema con telefono en claro deja "claro"', () => {
		const [puesto, esperado] = temaDelGuion(null, false).split('|');
		expect(esperado).toBe('claro');
		expect(puesto).toBe(esperado);
	});

	it('"contraste" guardado deja "contraste" aunque el telefono este en claro', () => {
		const [puesto, esperado] = temaDelGuion('contraste', false).split('|');
		expect(esperado).toBe('contraste');
		expect(puesto).toBe(esperado);
	});

	it('"oscuro" guardado deja "oscuro" aunque el telefono este en claro', () => {
		const [puesto, esperado] = temaDelGuion('oscuro', false).split('|');
		expect(esperado).toBe('oscuro');
		expect(puesto).toBe(esperado);
	});
});

// El color de la meta también está duplicado: si el script se queda con
// uno viejo, la barra cambia de color al cargar el bundle.
describe('color de theme-color del script previo al dibujo', () => {
	const meta = (): string | null =>
		document
			.querySelector('meta[name="theme-color"]')
			?.getAttribute('content') ?? null;

	for (const [preferencia, sistemaEnOscuro, tema] of [
		['claro', false, 'claro'],
		['oscuro', false, 'oscuro'],
		['contraste', false, 'contraste']
	] as const) {
		it(`el script pone en "${tema}" el mismo color que aplicarTema`, async () => {
			preparar(preferencia, sistemaEnOscuro);
			new Function(guion)();
			const delGuion = meta();
			await aplicarTema(tema);
			expect(delGuion).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(delGuion).toBe(meta());
		});
	}
});
