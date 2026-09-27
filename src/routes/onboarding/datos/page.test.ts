// @vitest-environment jsdom
//
// Pagina de datos del onboarding: el anuncio assertive del PRIMER campo
// con error corre en el mismo tick del click (antes del flushSync que
// nace el parrafo) y el foco va a ese campo, en el orden nombre -> edad
// -> peso -> altura (R2-001). El parrafo de error no lleva role propio
// que duplique el anuncio por region global. Las aserciones comparan
// contra las constantes del modulo validacion-datos (identidad, no
// redaccion).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDatos from './+page.svelte';
import { MENSAJE_NOMBRE_VACIO, MENSAJE_EDAD_INVALIDA } from '$lib/onboarding/validacion-datos';

// jsdom no trae ResizeObserver, que Svelte usa para bind:clientHeight
// (el espaciador de BarraAccion). Stub inerte, como en BarraAccion.test.ts.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const estadoMock = vi.hoisted(() => ({
	obtenerMock: vi.fn(),
	actualizarMock: vi.fn(),
	gotoMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	sonarMock: vi.fn()
}));

// goto va al SvelteKit real: se mockea porque en jsdom no hay cliente.
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

// resolve se usa en el boton atras; en jsdom no hay rutas.
vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

// Estado del flujo: en memoria, sin reactividad; la pagina lo lee via
// obtener() en un efecto. puedeVisitar true fija el foco del test en la
// validacion, no en la redireccion de progreso.
vi.mock('$lib/onboarding/estado', () => ({
	obtener: () => estadoMock.obtenerMock(),
	actualizar: (...args: unknown[]) => estadoMock.actualizarMock(...args),
	pasoPendiente: () => '/siguiente',
	puedeVisitar: () => true
}));

// Spy del canal assertivo: el contrato R2-001 es que la pagina anuncia
// por la region global y no por rol propio del parrafo.
vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

// Boton y BotonVolver suenan al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Pagina de datos', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.obtenerMock.mockReturnValue({
			disclaimer_aceptado: false,
			fecha_aceptacion_disclaimer: null,
			nombre: null,
			anio_nacimiento: null,
			peso_kg: null,
			altura_cm: null,
			objetivo: null,
			tiene_anclaje: null,
			zonas_dolor_preexistente: null,
			dias_semana: null,
			duracion_sesion_min: null,
			reps_push: null,
			reps_pull: null,
			reps_legs: null,
			segundos_core: null
		});
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function clickContinuar() {
		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Continuar'
		);
		expect(boton).toBeDefined();
		boton?.click();
	}

	it('nombre vacio: anuncia MENSAJE_NOMBRE_VACIO en el mismo tick y enfoca #nombre', () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		clickContinuar();

		// Mismo tick: el anuncio corre sin esperar el flush que nace el parrafo.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(MENSAJE_NOMBRE_VACIO);

		flushSync();

		const parrafo = document.body.querySelector('#error-nombre');
		expect(parrafo?.textContent).toBe(MENSAJE_NOMBRE_VACIO);
		expect(document.getElementById('nombre')).toBe(document.activeElement);
	});

	it('nombre y edad vacios: primer error y foco en nombre (orden R2-001), sin role propio', () => {		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		clickContinuar();

		// El primer error en orden nombre -> edad -> peso -> altura: con
		// los dos vacios, el anunciado es el de nombre, no el de edad.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(MENSAJE_NOMBRE_VACIO);
		expect(estadoMock.anunciarAssertiveMock).not.toHaveBeenCalledWith(MENSAJE_EDAD_INVALIDA);

		flushSync();

		const parrafo = document.body.querySelector('#error-nombre');
		expect(parrafo?.textContent).toBe(MENSAJE_NOMBRE_VACIO);
		// Sin role propio: el anuncio va por la region global.
		expect(parrafo?.getAttribute('role')).toBeNull();
		expect(document.getElementById('nombre')).toBe(document.activeElement);
	});
});

describe('Pagina de datos - altura en centimetros', () => {
	let instancia: ReturnType<typeof mount>;

	function estadoBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
		return {
			disclaimer_aceptado: false,
			fecha_aceptacion_disclaimer: null,
			nombre: null,
			anio_nacimiento: null,
			peso_kg: null,
			altura_cm: null,
			objetivo: null,
			tiene_anclaje: null,
			zonas_dolor_preexistente: null,
			dias_semana: null,
			duracion_sesion_min: null,
			reps_push: null,
			reps_pull: null,
			reps_legs: null,
			segundos_core: null,
			...overrides
		};
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.actualizarMock.mockReset();
		estadoMock.gotoMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function escribir(id: string, valor: string) {
		const input = document.getElementById(id) as HTMLInputElement;
		input.value = valor;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}

	it('una altura de 175 cm guardada se escribe 175', () => {
		estadoMock.obtenerMock.mockReturnValue(estadoBase({ altura_cm: 175 }));
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		expect((document.getElementById('altura') as HTMLInputElement).value).toBe('175');
		expect(document.getElementById('unidad-altura')?.textContent).toBe('cm');
	});

	it('escribir 175 guarda altura_cm 175', () => {
		estadoMock.obtenerMock.mockReturnValue(estadoBase());
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		escribir('nombre', 'Ana');
		escribir('edad', '30');
		escribir('peso', '70');
		escribir('altura', '175');
		flushSync();

		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Continuar'
		);
		(boton as HTMLButtonElement).click();
		flushSync();

		expect(estadoMock.actualizarMock).toHaveBeenCalledWith(
			expect.objectContaining({ altura_cm: 175 })
		);
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/siguiente');
	});
});
