// @vitest-environment jsdom
//
// Pagina /config/objetivo: elegir una opcion la aplica al instante, sin
// Guardar ni Cancelar. El aviso nombra el objetivo nuevo.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaObjetivo from './+page.svelte';
import { OBJETIVOS, type Objetivo, type Perfil } from '$lib/motor/schema';
import { etiquetaObjetivo, descripcionObjetivo } from '$lib/catalogo/etiquetas';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	actualizarPerfilMock: vi.fn(),
	sonarMock: vi.fn()
}));

const perfilMock = vi.hoisted(() => ({
	perfil: (): Perfil => ({
		id: 1,
		nombre: 'Ada',
		anio_nacimiento: 1985,
		peso_kg: 60,
		disclaimer_aceptado: true,
		fecha_aceptacion_disclaimer: 0,
		objetivo: 'fuerza',
		nivel_experiencia: 'principiante',
		evaluacion_por_patron: {
			PUSH: 'principiante',
			PULL: 'principiante',
			LEGS: 'principiante',
			CORE: 'principiante'
		},
		ajuste_desbalance_activo: null,
		fecha_evaluacion: 0,
		dias_semana: 3,
		duracion_sesion_min: 30,
		split: 'FULL_BODY',
		zonas_dolor_preexistente: [],
		tiene_anclaje: false,
		fecha_primera_sesion: null
	})
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$lib/db/consultas', () => ({
	suscribirPerfil: (...args: unknown[]) => {
		const alRecibir = args[0] as (perfil: Perfil | null) => void;
		alRecibir(perfilMock.perfil());
		return () => {};
	}
}));

vi.mock('$lib/db/perfil', () => ({
	actualizarPerfil: (...args: unknown[]) => estadoMock.actualizarPerfilMock(...args)
}));

// Sin mock de avisar ni de live-region: el canal real escribe en las
// regiones globales, que el test instala en el DOM y lee.
function instalarRegiones(): void {
	const polite = document.createElement('div');
	polite.id = 'live-polite';
	const assertive = document.createElement('div');
	assertive.id = 'live-assertive';
	document.body.append(polite, assertive);
}

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args)
}));

function nombreAccesible(obj: Objetivo): string {
	const input = document.querySelector(`input[value="${obj}"]`);
	expect(input, `existe el radio de ${obj}`).not.toBeNull();
	const labels = (input as HTMLInputElement).labels;
	expect(labels?.length, `el radio de ${obj} tiene su label`).toBe(1);
	return (labels?.[0].textContent ?? '').replace(/\s+/g, ' ').trim();
}

function elegir(obj: Objetivo): void {
	const input = document.querySelector(`input[value="${obj}"]`) as HTMLInputElement;
	input.click();
	flushSync();
}

function botonesConTexto(texto: string): HTMLButtonElement[] {
	return [...document.querySelectorAll('button')].filter((b) =>
		(b.textContent ?? '').includes(texto)
	) as HTMLButtonElement[];
}

describe('Pagina de configuracion de objetivo', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		instalarRegiones();
		estadoMock.gotoMock.mockReset();
		estadoMock.actualizarPerfilMock.mockReset().mockResolvedValue(1);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('el nombre accesible de cada opcion no lleva ":"', () => {
		instancia = mount(PaginaObjetivo, { target: document.body });
		flushSync();

		for (const obj of OBJETIVOS) {
			const nombre = nombreAccesible(obj);
			expect(nombre).toBe(`${etiquetaObjetivo(obj)} ${descripcionObjetivo(obj)}`);
			expect(nombre).not.toContain(':');
		}
	});

	it('elegir una opcion la guarda sin tocar ningun boton y la anuncia', async () => {
		instancia = mount(PaginaObjetivo, { target: document.body });
		flushSync();

		elegir('hipertrofia');

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledWith({ objetivo: 'hipertrofia' });
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.configuracion.objetivo.avisoAplicado(etiquetaObjetivo('hipertrofia'))
			);
		});
	});

	it('no tiene botones Guardar ni Cancelar', () => {
		instancia = mount(PaginaObjetivo, { target: document.body });
		flushSync();

		expect(botonesConTexto(M.configuracion.guardar)).toEqual([]);
		expect(botonesConTexto(M.configuracion.cancelar)).toEqual([]);
	});

	it('si falla la escritura lo anuncia y no navega', async () => {
		estadoMock.actualizarPerfilMock.mockRejectedValueOnce(new Error('sin base'));
		instancia = mount(PaginaObjetivo, { target: document.body });
		flushSync();

		elegir('hipertrofia');

		await vi.waitFor(() => {
			expect(document.getElementById('live-assertive')?.textContent).not.toBe('');
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});
});
