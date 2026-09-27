// @vitest-environment jsdom
//
// Pagina de evaluacion/core: "No puedo sostenerla" no navega (igual que
// en push/pull/legs): anota 0, anuncia y manda el foco al Continuar,
// que es el que avanza.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaCoreEvaluacion from './+page.svelte';

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

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$lib/onboarding/estado', () => ({
	obtener: () => estadoMock.obtenerMock(),
	actualizar: (...args: unknown[]) => estadoMock.actualizarMock(...args),
	pasoPendiente: () => '/siguiente',
	puedeVisitar: () => true,
	pasoAnterior: () => null
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Pagina de evaluacion core - "No puedo sostenerla"', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.obtenerMock.mockReset();
		estadoMock.actualizarMock.mockReset();
		estadoMock.gotoMock.mockReset();
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

	function botonNoPuedo(): HTMLButtonElement {
		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === 'No puedo sostenerla'
		);
		if (!boton) throw new Error('No hay boton "No puedo sostenerla"');
		return boton as HTMLButtonElement;
	}

	it('no navega: pone el campo en 0, anuncia y enfoca Continuar', () => {
		instancia = mount(PaginaCoreEvaluacion, { target: document.body });
		flushSync();

		botonNoPuedo().click();
		flushSync();

		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		expect(estadoMock.actualizarMock).toHaveBeenCalledWith({ segundos_core: 0 });
		expect((document.getElementById('segundos-input') as HTMLInputElement).value).toBe('0');
		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(
			'Anotado: ninguna. Toca «Continuar» para seguir.'
		);
		expect(document.activeElement).toBe(document.getElementById('continuar'));
	});

	it('Continuar tras "No puedo" avanza al paso siguiente', () => {
		instancia = mount(PaginaCoreEvaluacion, { target: document.body });
		flushSync();

		botonNoPuedo().click();
		flushSync();
		(document.getElementById('continuar') as HTMLButtonElement).click();
		flushSync();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/siguiente');
	});
});
