// @vitest-environment jsdom
//
// Pagina /config/equipamiento: misma pregunta y explicación que el alta,
// pero elegir solo guarda tiene_anclaje al instante, sin Guardar ni
// Cancelar y sin repetir la evaluación.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaEquipamiento from './+page.svelte';
import type { Perfil } from '$lib/motor/schema';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	actualizarPerfilMock: vi.fn(),
	tieneAnclaje: false
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
		alRecibir({ ...perfilBase, tiene_anclaje: estadoMock.tieneAnclaje });
		return () => {};
	}
}));

vi.mock('$lib/db/perfil', () => ({
	actualizarPerfil: (...args: unknown[]) => estadoMock.actualizarPerfilMock(...args)
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: () => {}
}));

function instalarRegiones(): void {
	const polite = document.createElement('div');
	polite.id = 'live-polite';
	const assertive = document.createElement('div');
	assertive.id = 'live-assertive';
	document.body.append(polite, assertive);
}

function elegir(valor: 'si' | 'no'): void {
	const input = document.querySelector(`input[value="${valor}"]`) as HTMLInputElement;
	expect(input, `existe la opción ${valor}`).not.toBeNull();
	input.click();
	flushSync();
}

describe('Pagina de configuracion de equipamiento', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		instalarRegiones();
		estadoMock.tieneAnclaje = false;
		estadoMock.gotoMock.mockReset();
		estadoMock.actualizarPerfilMock.mockReset().mockResolvedValue(1);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('usa la misma pregunta y explicación que el alta', () => {
		instancia = mount(PaginaEquipamiento, { target: document.body });
		flushSync();

		expect(document.body.querySelector('legend')?.textContent?.trim()).toBe(
			M.onboarding.equipamiento.leyenda
		);
		expect(document.body.textContent).toContain(M.onboarding.equipamiento.explicacion);
	});

	it('elegir "sí" guarda tiene_anclaje en true sin botón y lo anuncia', async () => {
		instancia = mount(PaginaEquipamiento, { target: document.body });
		flushSync();

		elegir('si');

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledWith({ tiene_anclaje: true });
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.perfil.resumen.equipo(true)
			);
		});
	});

	it('no tiene botones Guardar ni Cancelar', () => {
		instancia = mount(PaginaEquipamiento, { target: document.body });
		flushSync();

		const textos = [...document.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim());
		expect(textos).not.toContain(M.configuracion.guardar);
		expect(textos).not.toContain(M.configuracion.cancelar);
	});

	it('si falla la escritura lo anuncia y no navega', async () => {
		estadoMock.actualizarPerfilMock.mockRejectedValueOnce(new Error('sin base'));
		instancia = mount(PaginaEquipamiento, { target: document.body });
		flushSync();

		elegir('si');

		await vi.waitFor(() => {
			expect(document.getElementById('live-assertive')?.textContent).not.toBe('');
		});
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});
});
