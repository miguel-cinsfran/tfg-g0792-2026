// @vitest-environment jsdom
//
// Pagina /config/aspecto: mismo diseño que Objetivo (GrupoSeleccion) y
// elegir aplica al instante con aviso, sin Guardar ni Cancelar. Cada
// radio se anuncia con su etiqueta y su descripción.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaAspecto from './+page.svelte';
import { leerAspecto, guardarAspecto, type PreferenciaAspecto } from '$lib/aspecto/aspecto';
import { M } from '$lib/mensajes/ui';

vi.mock('$app/navigation', () => ({
	goto: () => {},
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: () => {},
}));

const OPCIONES: Array<{ valor: PreferenciaAspecto; etiqueta: string; descripcion: string }> = [
	{
		valor: 'sistema',
		etiqueta: M.configuracion.aspecto.sistemaEtiqueta,
		descripcion: M.configuracion.aspecto.sistemaDescripcion,
	},
	{
		valor: 'claro',
		etiqueta: M.configuracion.aspecto.claroEtiqueta,
		descripcion: M.configuracion.aspecto.claroDescripcion,
	},
	{
		valor: 'oscuro',
		etiqueta: M.configuracion.aspecto.oscuroEtiqueta,
		descripcion: M.configuracion.aspecto.oscuroDescripcion,
	},
	{
		valor: 'contraste',
		etiqueta: M.configuracion.aspecto.contrasteEtiqueta,
		descripcion: M.configuracion.aspecto.contrasteDescripcion,
	},
];

function instalarRegiones(): void {
	const polite = document.createElement('div');
	polite.id = 'live-polite';
	document.body.append(polite);
}

function radio(valor: PreferenciaAspecto): HTMLInputElement {
	const input = document.querySelector(`input[value="${valor}"]`);
	expect(input, `existe el radio ${valor}`).not.toBeNull();
	return input as HTMLInputElement;
}

function nombreAccesible(valor: PreferenciaAspecto): string {
	const labels = radio(valor).labels;
	expect(labels?.length, `el radio ${valor} tiene su label`).toBe(1);
	return (labels?.[0].textContent ?? '').replace(/\s+/g, ' ').trim();
}

function elegir(valor: PreferenciaAspecto): void {
	radio(valor).click();
	flushSync();
}

describe('Pagina de configuracion de aspecto', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		instalarRegiones();
		localStorage.clear();
		document.documentElement.removeAttribute('data-tema');
		document.head.innerHTML = '<meta name="theme-color" content="#F7F4EE" />';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('usa el titulo del contrato en h1 y pestana', () => {
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		expect(document.body.querySelector('h1')?.textContent?.trim()).toBe(
			M.configuracion.aspecto.titulo,
		);
		expect(document.title).toBe(M.configuracion.aspecto.titulo);
		expect(document.body.querySelector('legend')?.textContent?.trim()).toBe(
			M.configuracion.aspecto.leyenda,
		);
	});

	it('cada radio tiene su label con el texto del contrato', () => {
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		for (const opcion of OPCIONES) {
			expect(nombreAccesible(opcion.valor)).toBe(`${opcion.etiqueta} ${opcion.descripcion}`);
		}
	});

	it('el alto contraste no promete letra mas grande', () => {
		expect(M.configuracion.aspecto.contrasteDescripcion).toBe(
			'Negro, blanco y amarillo, con bordes marcados. Pensado para baja visión.'
		);
	});

	it('elegir "Oscuro" lo aplica, lo guarda y lo anuncia', async () => {
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		elegir('oscuro');

		await vi.waitFor(() => {
			expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
		});
		expect(leerAspecto()).toBe('oscuro');
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.configuracion.aspecto.avisoAplicado(M.configuracion.aspecto.oscuroEtiqueta)
			);
		});
	});

	it('elegir "Alto contraste" lo aplica, lo guarda y lo anuncia', async () => {
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		elegir('contraste');

		await vi.waitFor(() => {
			expect(document.documentElement.getAttribute('data-tema')).toBe('contraste');
		});
		expect(leerAspecto()).toBe('contraste');
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.configuracion.aspecto.avisoAplicado(M.configuracion.aspecto.contrasteEtiqueta)
			);
		});
	});

	it('preselecciona la opcion guardada al entrar', () => {
		guardarAspecto('oscuro');
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		expect(radio('oscuro').checked).toBe(true);
	});

	it('no tiene botones Guardar ni Cancelar: elegir ya aplica', () => {
		instancia = mount(PaginaAspecto, { target: document.body });
		flushSync();

		const textos = [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim());
		expect(textos).not.toContain(M.configuracion.guardar);
		expect(textos).not.toContain(M.configuracion.cancelar);
	});
});
