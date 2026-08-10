// @vitest-environment jsdom
//
// Pagina representativa del anuncio assertive de errores de validacion
// (los otros ocho sitios se cubren por inspeccion y por los tests de
// componente). El spy sobre anunciarAssertive se aserta ANTES del
// flushSync: el anuncio corre en el mismo tick del click, cuando el
// parrafo de error todavia no nacio en el DOM (la carrera que el
// anuncio por region global resuelve).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaObjetivo from './+page.svelte';

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

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$lib/onboarding/estado', () => ({
	obtener: () => estadoMock.obtenerMock(),
	actualizar: (...args: unknown[]) => estadoMock.actualizarMock(...args),
	pasoPendiente: () => '/onboarding/equipamiento',
	puedeVisitar: () => true
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Pagina de objetivo', () => {
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

	it('al fallar la validacion, anuncia el motivo en el mismo tick y mueve el foco', () => {
		instancia = mount(PaginaObjetivo, { target: document.body });
		flushSync();

		const botonContinuar = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Continuar'
		);
		expect(botonContinuar).toBeDefined();
		botonContinuar?.click();

		// Mismo tick: el anuncio corre sin esperar el flush que nace el parrafo.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(
			'Elige un objetivo para continuar.'
		);

		flushSync();

		const parrafo = document.body.querySelector('#grupo-objetivo-error');
		expect(parrafo?.textContent).toBe('Elige un objetivo para continuar.');
		const grupo = document.getElementById('grupo-objetivo');
		expect(grupo?.querySelector('input')).toBe(document.activeElement);
	});
});
