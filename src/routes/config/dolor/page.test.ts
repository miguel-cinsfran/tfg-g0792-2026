// @vitest-environment jsdom
//
// Pagina /config/dolor: marcar o desmarcar una zona la aplica al
// instante, sin Guardar ni Cancelar. El aviso nombra las zonas nuevas.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDolor from './+page.svelte';
import type { Perfil, EstadoEjercicio, Zona } from '$lib/motor/schema';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	actualizarPerfilMock: vi.fn(),
	zonas: [] as Zona[]
}));

const perfilBase: Perfil = {
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
};

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$lib/db/consultas', () => ({
	suscribirPerfil: (alRecibir: (perfil: Perfil | null) => void) => {
		alRecibir({ ...perfilBase, zonas_dolor_preexistente: [...estadoMock.zonas] });
		return () => {};
	},
	suscribirBloqueados: (alRecibir: (bloqueados: EstadoEjercicio[]) => void) => {
		alRecibir([]);
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

function marcar(zona: Zona): void {
	const input = document.querySelector(`input[value="${zona}"]`) as HTMLInputElement;
	input.click();
	flushSync();
}

function botonesConTexto(texto: string): HTMLButtonElement[] {
	return [...document.querySelectorAll('button')].filter((b) =>
		(b.textContent ?? '').includes(texto)
	) as HTMLButtonElement[];
}

describe('Pagina de configuracion de zonas con dolor', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		instalarRegiones();
		estadoMock.zonas = [];
		estadoMock.gotoMock.mockReset();
		estadoMock.actualizarPerfilMock.mockReset().mockResolvedValue(1);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('marcar una zona la guarda sin tocar ningun boton y la anuncia', async () => {
		instancia = mount(PaginaDolor, { target: document.body });
		flushSync();

		marcar('muñecas');

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledWith({
				zonas_dolor_preexistente: ['muñecas']
			});
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.configuracion.dolor.avisoAplicado('muñecas')
			);
		});
	});

	it('no tiene botones Guardar ni Cancelar', () => {
		instancia = mount(PaginaDolor, { target: document.body });
		flushSync();

		expect(botonesConTexto(M.configuracion.guardar)).toEqual([]);
		expect(botonesConTexto(M.configuracion.cancelar)).toEqual([]);
	});

	it('si falla la escritura lo anuncia y no navega', async () => {
		estadoMock.actualizarPerfilMock.mockRejectedValueOnce(new Error('sin base'));
		instancia = mount(PaginaDolor, { target: document.body });
		flushSync();

		marcar('muñecas');

		await vi.waitFor(() => {
			expect(document.getElementById('live-assertive')?.textContent).not.toBe('');
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});
});
