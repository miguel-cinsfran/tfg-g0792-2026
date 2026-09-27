// @vitest-environment jsdom
//
// El indice de configuracion lleva boton Atras antes del h1 en sus
// cuatro ramas y ese boton navega a /perfil (con la T1, el atras del
// telefono tambien llega ahi).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import IndiceConfig from './+page.svelte';
import type { Perfil, EstadoEjercicio } from '$lib/motor/schema';
import { M } from '$lib/mensajes/ui';

const estado = vi.hoisted(() => ({
	modo: 'perfil' as 'error' | 'cargando' | 'sin-perfil' | 'perfil',
	gotoMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estado.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

// El clic en Atras suena; en jsdom no hay audio ni base real.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: () => {},
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
		CORE: 'principiante',
	},
	ajuste_desbalance_activo: null,
	fecha_evaluacion: 0,
	dias_semana: 3,
	duracion_sesion_min: 30,
	split: 'FULL_BODY',
	zonas_dolor_preexistente: [],
	tiene_anclaje: false,
	fecha_primera_sesion: null,
};

vi.mock('$lib/db/consultas', () => ({
	suscribirPerfil: (
		alRecibir: (perfil: Perfil | null) => void,
		alFallar: (mensaje: string) => void,
	) => {
		if (estado.modo === 'error') alFallar('Fallo de lectura');
		else if (estado.modo === 'sin-perfil') alRecibir(null);
		else if (estado.modo === 'perfil') alRecibir(perfilBase);
		return () => {};
	},
	suscribirBloqueados: (alRecibir: (bloqueados: EstadoEjercicio[]) => void) => {
		alRecibir([]);
		return () => {};
	},
}));

const MODOS = ['error', 'cargando', 'sin-perfil', 'perfil'] as const;

describe('Atras del indice de configuracion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		localStorage.clear();
		estado.gotoMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	for (const modo of MODOS) {
		it(`en rama ${modo}: el primer control es el boton Atras, antes del h1`, () => {
			estado.modo = modo;
			instancia = mount(IndiceConfig, { target: document.body });
			flushSync();

			const controles = [...document.body.querySelectorAll('button, h1')];
			expect(controles.length).toBeGreaterThan(1);
			const primero = controles[0] as HTMLButtonElement;
			expect(primero.tagName).toBe('BUTTON');
			expect(primero.getAttribute('aria-label')).toBe('Atrás');
			expect(controles[1].tagName).toBe('H1');
			expect(controles[1].textContent).toBe(M.configuracion.indice.titulo);
		});

		it(`en rama ${modo}: tocar Atras navega a /perfil`, () => {
			estado.modo = modo;
			instancia = mount(IndiceConfig, { target: document.body });
			flushSync();

			const boton = document.body.querySelector('button') as HTMLButtonElement;
			boton.click();
			expect(estado.gotoMock).toHaveBeenCalledWith('/perfil');
		});
	}
});
