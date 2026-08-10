// @vitest-environment jsdom
//
// Lista de la biblioteca: cada fila lleva un id estable `ej-{id}` para
// poder localizar el origen al volver del detalle; al tocar una fila se
// registra el origen (origen-detalle) y al montar con origen registrado
// el foco y el scroll vuelven al boton del ejercicio de origen.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaBiblioteca from './+page.svelte';
import { popularCatalogo } from '$lib/catalogo/cargar';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import {
	registrarOrigenDetalle,
	leerOrigenDetalle,
	limpiarOrigenDetalle,
} from '$lib/a11y/origen-detalle.svelte';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args),
}));

const ejercicioCatalogo = (catalogoRaw as { ejercicios: { id: string }[] }).ejercicios;
const primerEjercicio = ejercicioCatalogo[0];

describe('Pagina de la biblioteca', () => {
	let instancia: ReturnType<typeof mount>;
	// jsdom no trae scrollIntoView ni hace layout: se reemplaza por un
	// noop que registra las llamadas (el spy de vitest sobre un metodo
	// reasignado en beforeEach filtraba llamadas entre tests).
	let scrollCalls: unknown[][];

	beforeEach(() => {
		document.body.innerHTML = '';
		popularCatalogo(catalogoRaw);
		limpiarOrigenDetalle();
		scrollCalls = [];
		Element.prototype.scrollIntoView = (opciones?: unknown) => {
			scrollCalls.push([opciones]);
		};
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('cada boton de ejercicio lleva id="ej-{id}" estable y unico', () => {
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		const botones = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'));
		expect(botones.length).toBe(ejercicioCatalogo.length);

		const ids = botones.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const ej of ejercicioCatalogo) {
			const boton = document.getElementById(`ej-${ej.id}`);
			expect(boton, `boton para ${ej.id}`).not.toBeNull();
			expect(boton?.tagName).toBe('BUTTON');
		}
	});

	it('clic en una fila registra el origen y navega al detalle', () => {
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		const boton = document.getElementById(`ej-${primerEjercicio.id}`) as HTMLButtonElement;
		boton.click();
		flushSync();

		expect(leerOrigenDetalle()).toBe(primerEjercicio.id);
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/biblioteca/[id]');
	});

	it('remonte con origen: foco y scroll en el boton de origen, origen consumido', () => {
		registrarOrigenDetalle(primerEjercicio.id);
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		const boton = document.getElementById(`ej-${primerEjercicio.id}`);
		expect(document.activeElement).toBe(boton);
		expect(scrollCalls).toEqual([[{ block: 'center' }]]);
		expect(leerOrigenDetalle()).toBeNull();
	});

	it('sin origen: foco en el h1 de la lista', () => {
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		expect(document.activeElement).toBe(document.querySelector('h1'));
		expect(scrollCalls).toEqual([]);
	});

	it('origen sin elemento en el DOM: foco en el h1, sin excepcion', () => {
		registrarOrigenDetalle('ej-inexistente');
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		expect(document.activeElement).toBe(document.querySelector('h1'));
		expect(scrollCalls).toEqual([]);
	});
});
