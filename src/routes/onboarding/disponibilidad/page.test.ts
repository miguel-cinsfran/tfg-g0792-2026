// @vitest-environment jsdom
//
// Pagina de disponibilidad: con dias y duracion vacios, el anuncio
// assertive es del PRIMER campo con error (dias, antes que duracion) y
// el foco va a ese mismo grupo. Los demas sitios (objetivo,
// equipamiento) ya tienen tests separados; este fija el orden del
// primer error y su foco, que los tests de componente no ven.
//
// El spy sobre anunciarAssertive se aserta ANTES del flushSync: el
// anuncio corre en el mismo tick del click, cuando el parrafo de error
// todavia no nacio en el DOM (la carrera que el anuncio por region
// global resuelve).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDisponibilidad from './+page.svelte';

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

// Estado del flujo: en memoria, sin reactividad; la pagina lo lee via
// obtener() en un efecto. puedeVisitar true fija el foco del test en la
// validacion, no en la redireccion de progreso.
vi.mock('$lib/onboarding/estado', () => ({
	obtener: () => estadoMock.obtenerMock(),
	actualizar: (...args: unknown[]) => estadoMock.actualizarMock(...args),
	pasoPendiente: () => '/siguiente',
	puedeVisitar: () => true
}));

// Spy del canal assertivo: el contrato del cambio es que la pagina
// anuncia por la region global y no por rol propio del parrafo.
vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

// Boton y GrupoSeleccion suenan al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Pagina de disponibilidad', () => {
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

	it('con los dos campos vacios, anuncia el primer error (dias antes que duracion) y enfoca el primer grupo', () => {
		instancia = mount(PaginaDisponibilidad, { target: document.body });
		flushSync();

		const botonContinuar = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Continuar'
		);
		expect(botonContinuar).toBeDefined();
		botonContinuar?.click();

		// Mismo tick: el anuncio corre sin esperar el flush que nace el parrafo.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(
			'Elige cuántos días por semana.'
		);

		flushSync();

		const parrafo = document.body.querySelector('#grupo-dias-error');
		expect(parrafo?.textContent).toBe('Elige cuántos días por semana.');
		const grupo = document.getElementById('grupo-dias');
		expect(grupo?.querySelector('input')).toBe(document.activeElement);
	});
});
