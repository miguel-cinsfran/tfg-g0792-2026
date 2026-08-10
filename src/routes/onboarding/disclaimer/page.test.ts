// @vitest-environment jsdom
//
// Pagina de disclaimer: el parrafo visible y el anuncio assertive salen
// de la misma constante MENSAJE_CASILLA (fuente unica). Sin la casilla
// marcada, el error anuncia, se muestra y el foco va a la casilla.
//
// El spy sobre anunciarAssertive se aserta ANTES del flushSync: el
// anuncio corre en el mismo tick del click, cuando el parrafo de error
// todavia no nacio en el DOM (la carrera que el anuncio por region
// global resuelve).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDisclaimer from './+page.svelte';

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

// resolve se usa en el onImportado del respaldo; en jsdom no hay rutas.
vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

// Estado del flujo: en memoria, sin reactividad; la pagina lo lee via
// obtener() al montar. puedeVisitar true fija el foco del test en la
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

// Boton y BotonVolver suenan al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

// ImportarRespaldo vive en la pagina pero no se toca en este escenario.
// Su cadena llega a Dexie; el test del componente ya la aísla igual
// (ImportarRespaldo.test.ts), asi que este test de pagina no depende de
// la base local.
vi.mock('$lib/importar/importar', () => ({
	importarDatos: (...args: unknown[]) => estadoMock.actualizarMock(...args)
}));

describe('Pagina de disclaimer', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
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

	it('al hacer click en "Aceptar y continuar" sin marcar la casilla, anuncia MENSAJE_CASILLA y enfoca la casilla', () => {
		instancia = mount(PaginaDisclaimer, { target: document.body });
		flushSync();

		const botonAceptar = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Aceptar y continuar'
		);
		expect(botonAceptar).toBeDefined();
		botonAceptar?.click();

		// Mismo tick: el anuncio corre sin esperar el flush que nace el parrafo.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(
			'Marca la casilla para continuar.'
		);

		flushSync();

		const parrafo = document.body.querySelector('#error-disclaimer');
		expect(parrafo?.textContent).toBe('Marca la casilla para continuar.');
		expect(document.getElementById('cb-disclaimer')).toBe(document.activeElement);
	});
});
