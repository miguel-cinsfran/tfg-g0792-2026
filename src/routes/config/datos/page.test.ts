// @vitest-environment jsdom
//
// Pagina /config/datos: conserva Guardar y Cancelar porque se escribe.
// Cancelar no guarda lo escrito; Cancelar va a la izquierda de Guardar.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaDatos from './+page.svelte';
import type { Perfil } from '$lib/motor/schema';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	actualizarPerfilMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	anunciarAssertiveMock: vi.fn()
}));

const perfilBase: Perfil = {
	id: 1,
	nombre: 'Ada',
	anio_nacimiento: 1985,
	peso_kg: 60,
	altura_cm: 175,
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
		alRecibir(perfilBase);
		return () => {};
	}
}));

vi.mock('$lib/db/perfil', () => ({
	actualizarPerfil: (...args: unknown[]) => estadoMock.actualizarPerfilMock(...args)
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args)
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: () => {}
}));

function boton(texto: string): HTMLButtonElement {
	const botones = [...document.querySelectorAll('button')].filter((b) =>
		(b.textContent ?? '').trim() === texto
	);
	expect(botones, `existe el botón ${texto}`).toHaveLength(1);
	return botones[0] as HTMLButtonElement;
}

function escribir(id: string, valor: string): void {
	const input = document.getElementById(id) as HTMLInputElement;
	input.value = valor;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function enviarFormulario(): void {
	const form = document.querySelector('form');
	expect(form, 'existe el formulario').not.toBeNull();
	form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	flushSync();
}

describe('Pagina de configuracion de datos personales', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.actualizarPerfilMock.mockReset().mockResolvedValue(1);
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('Cancelar no guarda lo escrito y vuelve a Configuración', () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		escribir('datos-nombre', 'Nombre cambiado');
		boton(M.configuracion.cancelar).click();
		flushSync();

		expect(estadoMock.actualizarPerfilMock).not.toHaveBeenCalled();
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/config');
	});

	it('Guardar persiste los datos y vuelve a Configuración', async () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		enviarFormulario();

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledOnce();
		});
		await vi.waitFor(() => {
			expect(estadoMock.gotoMock).toHaveBeenCalledWith('/config');
		});
	});

	it('la altura se pide en centímetros enteros con su unidad', () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		expect((document.getElementById('datos-altura') as HTMLInputElement).value).toBe('175');
		expect(document.getElementById('unidad-datos-altura')?.textContent).toBe('cm');
	});

	it('guardar con 175 deja altura_cm en 175', async () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		enviarFormulario();

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledOnce();
		});
		const parche = estadoMock.actualizarPerfilMock.mock.calls[0][0] as { altura_cm?: number };
		expect(parche.altura_cm).toBe(175);
	});

	it('la altura en metros ya no vale: muestra el error de cm y no guarda', async () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		escribir('datos-altura', '1,75');
		enviarFormulario();

		await vi.waitFor(() => {
			expect(document.getElementById('error-datos-altura')?.textContent).toBe(
				M.onboarding.datos.errorAlturaCm
			);
		});
		expect(estadoMock.actualizarPerfilMock).not.toHaveBeenCalled();
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});
	it('Cancelar va antes que Guardar en el DOM (izquierda en fila)', () => {
		instancia = mount(PaginaDatos, { target: document.body });
		flushSync();

		expect(document.body.querySelector('h1')?.textContent?.trim()).toBe('Datos personales');
		const cancelar = boton(M.configuracion.cancelar);
		const guardar = boton(M.configuracion.guardar);
		expect(cancelar.compareDocumentPosition(guardar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
