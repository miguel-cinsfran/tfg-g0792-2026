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
import { db } from '$lib/db/db';
import { guardarPerfil } from '$lib/db/perfil';
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
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

	afterEach(async () => {
		if (instancia) unmount(instancia);
		await Promise.all(db.tables.map((t) => t.clear()));
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

describe('Biblioteca - fuera del plan', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(async () => {
		document.body.innerHTML = '';
		popularCatalogo(catalogoRaw);
		await Promise.all(db.tables.map((t) => t.clear()));
	});

	afterEach(async () => {
		if (instancia) unmount(instancia);
		await Promise.all(db.tables.map((t) => t.clear()));
	});

	function botonesCon(texto: string): HTMLButtonElement[] {
		return Array.from(document.body.querySelectorAll('button')).filter((b) =>
			b.textContent?.includes(texto)
		) as HTMLButtonElement[];
	}

	it('sin anclaje: los seis de tirar muestran necesita barra o anclaje', async () => {
		await guardarPerfil(perfilBase({ tiene_anclaje: false }));
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			expect(botonesCon('No entra en tu plan: necesita barra o anclaje').length).toBe(6);
		});
	});

	it('con anclaje y munecas: ninguno por anclaje y al menos uno por dolor', async () => {
		await guardarPerfil(perfilBase({ tiene_anclaje: true, zonas_dolor_preexistente: ['muñecas'] }));
		instancia = mount(PaginaBiblioteca, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			expect(botonesCon('No entra en tu plan: carga muñecas').length).toBeGreaterThan(0);
		});
		expect(botonesCon('No entra en tu plan: necesita barra o anclaje')).toHaveLength(0);
	});
});
