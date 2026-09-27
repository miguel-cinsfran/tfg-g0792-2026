// @vitest-environment jsdom
//
// Preferencia "Aspecto": vive en localStorage como la de pantalla
// encendida y se resuelve a un tema concreto antes de dibujar.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
	Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@capacitor/status-bar', () => ({
	StatusBar: { setBackgroundColor: () => Promise.resolve(), setStyle: () => Promise.resolve() },
	Style: { Light: 'LIGHT', Dark: 'DARK', Default: 'DEFAULT' },
}));

import {
	leerAspecto,
	guardarAspecto,
	resolverTemaAspecto,
	aplicarTema,
	aplicarPreferenciaAspecto,
	iniciarEscuchaSistema,
} from './aspecto';

type OyenteCambio = (evento: { matches: boolean }) => void;

let sistemaEnOscuro = false;
let oyentes: OyenteCambio[] = [];

function instalarMatchMedia(): void {
	oyentes = [];
	window.matchMedia = ((consulta: string) => ({
		matches: sistemaEnOscuro,
		media: consulta,
		addEventListener: (_tipo: string, fn: OyenteCambio) => {
			oyentes.push(fn);
		},
		removeEventListener: (_tipo: string, fn: OyenteCambio) => {
			oyentes = oyentes.filter((o) => o !== fn);
		},
		dispatchEvent: () => false,
	})) as unknown as typeof window.matchMedia;
}

function cambiarSistema(aOscuro: boolean): void {
	sistemaEnOscuro = aOscuro;
	for (const fn of [...oyentes]) fn({ matches: aOscuro });
}

function contenidoMeta(): string | null {
	return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.removeAttribute('data-tema');
	document.head.innerHTML = '<meta name="theme-color" content="#F7F4EE" />';
	sistemaEnOscuro = false;
	instalarMatchMedia();
});

describe('lectura y guardado de la preferencia', () => {
	it('sin nada guardado lee "sistema"', () => {
		expect(leerAspecto()).toBe('sistema');
	});

	it('un valor invalido lee "sistema"', () => {
		localStorage.setItem('aspecto', 'medianoche');
		expect(leerAspecto()).toBe('sistema');
	});

	it('guardar "oscuro" y leer devuelve "oscuro"', () => {
		guardarAspecto('oscuro');
		expect(leerAspecto()).toBe('oscuro');
	});
});

describe('resolucion de la preferencia a tema', () => {
	it('"sistema" se resuelve a "oscuro" si el sistema prefiere oscuro', () => {
		expect(resolverTemaAspecto('sistema', true)).toBe('oscuro');
	});

	it('"sistema" se resuelve a "claro" si el sistema no prefiere oscuro', () => {
		expect(resolverTemaAspecto('sistema', false)).toBe('claro');
	});

	it('"contraste" se resuelve a "contraste" en los dos casos', () => {
		expect(resolverTemaAspecto('contraste', true)).toBe('contraste');
		expect(resolverTemaAspecto('contraste', false)).toBe('contraste');
	});
});

describe('aplicacion del tema al documento', () => {
	it('aplicar "claro" pone data-tema y el color de la meta', async () => {
		await aplicarTema('claro');
		expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
		expect(contenidoMeta()).toBe('#F7F4EE');
	});

	it('aplicar "oscuro" pone data-tema y el color de la meta', async () => {
		await aplicarTema('oscuro');
		expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
		expect(contenidoMeta()).toBe('#1C1917');
	});

	it('aplicar "contraste" pone data-tema y el color de la meta', async () => {
		await aplicarTema('contraste');
		expect(document.documentElement.getAttribute('data-tema')).toBe('contraste');
		expect(contenidoMeta()).toBe('#000000');
	});
});

describe('escucha del cambio del sistema', () => {
	it('con "sistema" re-aplica al cambiar a oscuro', async () => {
		guardarAspecto('sistema');
		await aplicarPreferenciaAspecto();
		expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
		const detener = iniciarEscuchaSistema();
		cambiarSistema(true);
		await Promise.resolve();
		expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
		detener();
	});

	it('con preferencia explicita no re-aplica al cambiar el sistema', async () => {
		guardarAspecto('claro');
		await aplicarPreferenciaAspecto();
		const detener = iniciarEscuchaSistema();
		cambiarSistema(true);
		await Promise.resolve();
		expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
		detener();
	});
});
