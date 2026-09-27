// @vitest-environment jsdom
//
// Pagina de evaluacion/push: el error de conteo anuncia assertive (ya
// no polite) con el mismo MENSAJE_INVALIDO que muestra el parrafo, y el
// foco va al input. El cero en anunciarPolite fija el cambio de canal:
// antes de este cambio el error iba por la region polite.
//
// El spy sobre anunciarAssertive se aserta ANTES del flushSync: el
// anuncio corre en el mismo tick del click, cuando el parrafo de error
// todavia no nacio en el DOM (la carrera que el anuncio por region
// global resuelve).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaPushEvaluacion from './+page.svelte';

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
	sonarMock: vi.fn(),
	gruposOmitidosMock: vi.fn()
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
	puedeVisitar: () => true,
	gruposOmitidosPorDolor: () => estadoMock.gruposOmitidosMock()
}));

// Spy de los dos canales: el contraste entre ellos es el aserto clave.
vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

// Boton y BotonVolver suenan al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

// validarConteo y DESCRIPCION_FLEXIONES quedan reales: funciones puras
// y dato estatico, sin I/O ni estado compartido.

describe('Pagina de evaluacion push', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.gruposOmitidosMock.mockReset();
		estadoMock.gruposOmitidosMock.mockReturnValue([]);
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

	it('al fallar la validacion, anuncia assertive (no polite) con MENSAJE_INVALIDO y enfoca el input', () => {		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		const botonContinuar = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'Continuar'
		);
		expect(botonContinuar).toBeDefined();
		botonContinuar?.click();

		// Mismo tick: el anuncio corre sin esperar el flush que nace el parrafo.
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(
			'Escribe cuántas repeticiones hiciste, o usa «No puedo hacer ninguna».'
		);
		// El cambio de canal: el error ya no interrumpe por polite.
		expect(estadoMock.anunciarPoliteMock).not.toHaveBeenCalled();

		flushSync();

		const parrafo = document.body.querySelector('#error-reps');
		expect(parrafo?.textContent).toBe(
			'Escribe cuántas repeticiones hiciste, o usa «No puedo hacer ninguna».'
		);
		expect(document.getElementById('reps-input')).toBe(document.activeElement);
	});
});

describe('Pagina de evaluacion push - "No puedo hacer ninguna"', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.actualizarMock.mockReset();
		estadoMock.gotoMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.gruposOmitidosMock.mockReset();
		estadoMock.gruposOmitidosMock.mockReturnValue([]);
		estadoMock.obtenerMock.mockReturnValue({
			disclaimer_aceptado: false,
			fecha_aceptacion_disclaimer: null,
			nombre: null,
			anio_nacimiento: null,
			peso_kg: null,
			altura_cm: null,
			objetivo: null,
			tiene_anclaje: true,
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

	function botonNoPuedo(): HTMLButtonElement {
		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'No puedo hacer ninguna'
		);
		if (!boton) throw new Error('No hay boton "No puedo hacer ninguna"');
		return boton as HTMLButtonElement;
	}

	it('no navega: pone el campo en 0, anuncia y enfoca Continuar', () => {
		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		botonNoPuedo().click();
		flushSync();

		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		expect(estadoMock.actualizarMock).toHaveBeenCalledWith({ reps_push: 0 });
		expect((document.getElementById('reps-input') as HTMLInputElement).value).toBe('0');
		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(
			'Anotado: ninguna. Toca «Continuar» para seguir.'
		);
		expect(document.activeElement).toBe(document.getElementById('continuar'));
	});

	it('Continuar tras "No puedo" avanza al paso siguiente', () => {
		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		botonNoPuedo().click();
		flushSync();
		(document.getElementById('continuar') as HTMLButtonElement).click();
		flushSync();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/siguiente');
	});
});

describe('Pagina de evaluacion push - conteo de preguntas', () => {
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
			tiene_anclaje: true,
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
		estadoMock.gruposOmitidosMock.mockReset();
		estadoMock.gruposOmitidosMock.mockReturnValue([]);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('con anclaje y sin dolor: ultimas cuatro preguntas', () => {
		estadoMock.obtenerMock.mockReturnValue(estadoBase());
		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		expect(document.body.textContent).toContain('Últimas cuatro preguntas');
	});

	it('sin anclaje: ultimas tres preguntas', () => {
		estadoMock.obtenerMock.mockReturnValue(estadoBase({ tiene_anclaje: false }));
		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		expect(document.body.textContent).toContain('Últimas tres preguntas');
		expect(document.body.textContent).not.toContain('Últimas cuatro preguntas');
	});

	it('con tres grupos salteados por dolor: ultima pregunta en singular', () => {
		estadoMock.obtenerMock.mockReturnValue(estadoBase());
		estadoMock.gruposOmitidosMock.mockReturnValue(['PULL', 'LEGS', 'CORE']);
		instancia = mount(PaginaPushEvaluacion, { target: document.body });
		flushSync();

		expect(document.body.textContent).toContain('Última pregunta');
		expect(document.body.textContent).not.toContain('Últimas');
	});
});
