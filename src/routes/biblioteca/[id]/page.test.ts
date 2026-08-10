// @vitest-environment jsdom
//
// Detalle de ejercicio: volver() usa history.back() cuando hay un origen
// registrado (SvelteKit y el navegador restauran scroll y foco) y el
// origen sobrevive al push de cambio de variante; sin origen, hace
// goto a la lista y limpia.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDetalle from './+page.svelte';
import { popularCatalogo } from '$lib/catalogo/cargar';
import { guardarPerfil } from '$lib/db/perfil';
import { M } from '$lib/mensajes/ui';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import {
	registrarOrigenDetalle,
	leerOrigenDetalle,
	limpiarOrigenDetalle,
} from '$lib/a11y/origen-detalle.svelte';

const estadoMock = vi.hoisted(() => ({
	// id del ejercicio bajo prueba; getter para poder cambiarlo entre tests.
	id: 'ej-001-push-h-flexion-pared',
	gotoMock: vi.fn(),
	sonarMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	// Resuelve el placeholder [id] con params, como el SvelteKit real:
	// así el test puede afirmar el destino concreto de la variante.
	resolve: (ruta: string, params?: Record<string, string>) => {
		if (!params) return ruta;
		return ruta.replace('[id]', params.id ?? '');
	},
}));

vi.mock('$app/state', () => ({
	page: {
		get params() {
			return { id: estadoMock.id };
		},
	},
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args),
}));

// BotonVolver suena al interactuar; silenciar en tests.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
}));

// Escribir en estado_ejercicios con el liveQuery de la página activo
// cuelga a fake-indexeddb (transacción de escritura que nunca cierra).
// El mock mantiene el foco del test en la navegación, no en Dexie.
vi.mock('$lib/db/estado', () => ({
	obtenerEstadosBloqueados: () => Promise.resolve([]),
	marcarResuelto: () => Promise.resolve(),
	guardarEstado: () => Promise.resolve(),
}));

describe('Detalle de ejercicio', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		popularCatalogo(catalogoRaw);
		limpiarOrigenDetalle();
		estadoMock.gotoMock.mockReset();
		estadoMock.id = 'ej-001-push-h-flexion-pared';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	function clickVolver(): void {
		const volver = document.body.querySelector<HTMLButtonElement>('button[aria-label="Atrás"]');
		expect(volver, 'BotonVolver presente').not.toBeNull();
		volver?.click();
		flushSync();
	}

	function boton(texto: string): HTMLButtonElement | undefined {
		return Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
			(b) => b.textContent?.trim() === texto,
		);
	}

	it('con origen registrado usa history.back y conserva el origen', () => {
		const backSpy = vi.spyOn(history, 'back').mockImplementation(() => {});
		registrarOrigenDetalle('ej-001-push-h-flexion-pared');
		instancia = mount(PaginaDetalle, { target: document.body });
		flushSync();

		clickVolver();

		expect(backSpy).toHaveBeenCalledTimes(1);
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		// El origen sobrevive: un segundo volver (o el push de variante
		// en el medio) sigue encontrandolo.
		expect(leerOrigenDetalle()).toBe('ej-001-push-h-flexion-pared');
		backSpy.mockRestore();
	});

	it('sin origen hace goto a la lista y limpia', () => {
		instancia = mount(PaginaDetalle, { target: document.body });
		flushSync();

		clickVolver();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/biblioteca');
		expect(leerOrigenDetalle()).toBeNull();
	});

	it('cambio de variante: el push a otro detalle no borra el origen', async () => {
		// El push de variante navega al detalle destino sin tocar el
		// origen: volver desde el destino regresa a este detalle y un
		// segundo volver llega a la lista con el foco en el origen.
		await guardarPerfil(perfilBase());
		registrarOrigenDetalle('ej-001-push-h-flexion-pared');
		instancia = mount(PaginaDetalle, { target: document.body });
		flushSync();

		// Perfil y catálogo llegan async: esperar el botón de variante.
		await vi.waitFor(() => {
			expect(boton(M.biblioteca.botonVarianteDificil)).toBeDefined();
		});
		boton(M.biblioteca.botonVarianteDificil)?.click();
		flushSync();

		const confirmar = boton('Confirmar el cambio');
		expect(confirmar, 'modal de confirmación abierto').toBeDefined();
		estadoMock.gotoMock.mockClear();
		confirmar?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(estadoMock.gotoMock).toHaveBeenCalled();
		});
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/biblioteca/ej-002-push-h-flexion-inclinada');
		// El origen sobrevive al push: el siguiente volver() vuelve acá.
		expect(leerOrigenDetalle()).toBe('ej-001-push-h-flexion-pared');
	});
});
