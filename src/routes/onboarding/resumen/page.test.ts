// @vitest-environment jsdom
//
// El resumen, como el resto del alta, tiene boton Atras para volver a
// corregir un dato. La asercion va sobre el rol y el nombre accesible ('Atras', el mismo de
// las demas pantallas), nunca sobre clases de CSS.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaResumen from './+page.svelte';
import { estadoOnboardingCompleto } from '$lib/../../tests/fixtures/onboarding-base';
import { popularCatalogo } from '$lib/catalogo/cargar';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { M } from '$lib/mensajes/ui';
import { mensajePara } from '$lib/errores/mensajes';

// jsdom no trae ResizeObserver (BarraAccion lo usa en mount); stub inerte.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const estadoMock = vi.hoisted(() => ({
	estado: null as ReturnType<typeof estadoOnboardingCompleto> | null,
	gotoMock: vi.fn(),
	sonarMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
	pasoAnteriorMock: vi.fn(),
	finalizarMock: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$lib/onboarding/estado', () => ({
	obtener: () => estadoMock.estado,
	pasoPendiente: () => '/onboarding/evaluacion/core',
	puedeVisitar: () => true,
	pasoAnterior: (...args: unknown[]) => estadoMock.pasoAnteriorMock(...args)
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: () => {},
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

vi.mock('$lib/onboarding/finalizar', async (importOriginal) => {
	const real = await importOriginal<typeof import('$lib/onboarding/finalizar')>();
	return {
		finalizar: (...args: unknown[]) => estadoMock.finalizarMock(...args),
		construirPerfil: real.construirPerfil
	};
});

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

describe('Resumen del alta', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.pasoAnteriorMock.mockReset();
		estadoMock.finalizarMock.mockReset();
		estadoMock.finalizarMock.mockResolvedValue(undefined);
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.estado = estadoOnboardingCompleto();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function botonAtras(): HTMLButtonElement | undefined {
		return Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.getAttribute('aria-label') === M.componentes.botonVolver.atras
		);
	}

	it('expone un control "Atrás" como las demás pantallas del alta', () => {
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		expect(botonAtras()).toBeDefined();
	});

	it('con anclaje, activar Atrás navega al paso anterior (evaluacion/core)', () => {
		estadoMock.pasoAnteriorMock.mockReturnValue('/onboarding/evaluacion/core');
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		botonAtras()?.click();
		flushSync();

		expect(estadoMock.pasoAnteriorMock).toHaveBeenCalledWith('/onboarding/resumen');
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/onboarding/evaluacion/core');
	});

	it('sin anclaje, activar Atrás navega a evaluacion/core (paso anterior real)', () => {		estadoMock.estado = estadoOnboardingCompleto({ tiene_anclaje: false });
		estadoMock.pasoAnteriorMock.mockReturnValue('/onboarding/evaluacion/core');
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		botonAtras()?.click();
		flushSync();

		expect(estadoMock.pasoAnteriorMock).toHaveBeenCalledWith('/onboarding/resumen');
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/onboarding/evaluacion/core');
	});
});

describe('Resumen: error al finalizar', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		const live = document.createElement('div');
		live.id = 'live-assertive';
		live.setAttribute('role', 'alert');
		live.setAttribute('aria-live', 'assertive');
		document.body.appendChild(live);
		estadoMock.gotoMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.finalizarMock.mockReset();
		estadoMock.estado = estadoOnboardingCompleto();
		estadoMock.anunciarAssertiveMock.mockImplementation((msg: string) => {
			const region = document.getElementById('live-assertive');
			if (!region) return;
			region.textContent = '';
			setTimeout(() => { region.textContent = msg as string; }, 50);
		});
		estadoMock.finalizarMock.mockRejectedValue(new Error('fail'));
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('al fallar finalizar muestra el mensaje sin role alert y lo anuncia por assertive', async () => {
		vi.useFakeTimers();
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();
		const boton = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === M.onboarding.resumen.botonEmpezar) as HTMLButtonElement;
		expect(boton).toBeDefined();
		boton.click();
		flushSync();
		await vi.advanceTimersByTimeAsync(60);
		flushSync();
		const esperado = mensajePara('ERR-DB-WRITE');
		const parrafo = Array.from(document.body.querySelectorAll('p')).find((p) => p.textContent === esperado) as HTMLElement;
		expect(parrafo).toBeDefined();
		expect(parrafo.textContent).toBe(esperado);
		expect(parrafo.getAttribute('role')).toBeNull();
		const region = document.getElementById('live-assertive') as HTMLElement;
		expect(region.textContent).toBe(esperado);
	});
});

describe('Resumen: empezar abre la sesion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.finalizarMock.mockReset();
		estadoMock.finalizarMock.mockResolvedValue(undefined);
		estadoMock.estado = estadoOnboardingCompleto();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function botonEmpezar(): HTMLButtonElement {
		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === M.onboarding.resumen.botonEmpezar
		);
		if (!boton) throw new Error('No hay boton de empezar');
		return boton as HTMLButtonElement;
	}

	it('navega a /sesion, no al inicio', async () => {
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		botonEmpezar().click();
		flushSync();
		await vi.waitFor(() => {
			expect(estadoMock.gotoMock).toHaveBeenCalledWith('/sesion');
		});
	});

	it('si falla el guardado no navega a ningun lado', async () => {
		estadoMock.finalizarMock.mockRejectedValue(new Error('fail'));
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		botonEmpezar().click();
		flushSync();
		await vi.waitFor(() => {
			expect(estadoMock.finalizarMock).toHaveBeenCalled();
		});
		flushSync();

		expect(estadoMock.gotoMock).not.toHaveBeenCalledWith('/sesion');
		expect(estadoMock.gotoMock).not.toHaveBeenCalledWith('/');
	});
});

describe('Resumen: contenido del alta', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		popularCatalogo(catalogoRaw);
		estadoMock.gotoMock.mockReset();
		estadoMock.finalizarMock.mockReset();
		estadoMock.finalizarMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function texto(): string {
		return document.body.textContent ?? '';
	}

	it('completo con anclaje: nivel con porque, una linea por prueba y plan sin frases de fuera', () => {
		estadoMock.estado = estadoOnboardingCompleto();
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		expect(texto()).toContain('Tu nivel es intermedio: es el que más se repitió en tus cuatro pruebas.');
		expect(texto()).toContain('Empujar: 15 flexiones');
		expect(texto()).toContain('Tirar: 10 repeticiones de remo');
		expect(texto()).toContain('Piernas: 20 sentadillas');
		expect(texto()).toContain('Abdomen: 45 segundos de plancha');
		expect(texto()).toContain('Entrenas 3 días por semana en sesiones de 30 minutos.');
		expect(texto()).toContain('Tu primera sesión es de');
		expect(texto()).not.toContain('no tienes barra ni anclaje');
		expect(texto()).not.toContain('deja fuera');
	});

	it('sin anclaje: Tirar no se probo y el plan lo dice con su causa', () => {
		estadoMock.estado = estadoOnboardingCompleto({ tiene_anclaje: false, reps_pull: null });
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		expect(texto()).toContain('Tirar: no se probó, no tienes barra ni anclaje.');
		expect(texto()).toContain(
			'Tu plan no incluye ejercicios de tirar porque necesitan una barra o un anclaje.'
		);
		expect(texto()).toContain('en tus tres pruebas');
	});

	it('con dolor en munecas: Empujar no se probo y el plan lo dice con su causa', () => {
		estadoMock.estado = estadoOnboardingCompleto({
			zonas_dolor_preexistente: ['muñecas'],
			reps_push: null
		});
		instancia = mount(PaginaResumen, { target: document.body });
		flushSync();

		expect(texto()).toContain('Empujar: no se probó por el dolor en muñecas.');
		expect(texto()).toContain(
			'Tu plan deja fuera los ejercicios que cargan las zonas con dolor que marcaste: muñecas.'
		);
	});
});
