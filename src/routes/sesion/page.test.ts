// @vitest-environment jsdom
//
// Plan vacio en /sesion (REQ-RUT-003): cuando generarSesion devuelve un
// plan vacio, la ruta muestra el mensaje del contrato (M.sesion.
// errorPlanVacio, sin literal), lo anuncia assertive UNA vez, ofrece
// como primaria "Revisar mis zonas con dolor" -> /config/dolor y deja
// una sola "Volver al inicio" (el BotonVolver superior). No llama a
// comenzar. Otros errores (sin perfil, REQ-RUT-016) se conservan.
//
// Resumen de cierre (defecto 8 ago 2026): un ejecutado con cero series
// completadas (dolor antes de la primera serie) no aparece en "Ejercicios
// que hiciste".

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { mount, unmount, flushSync } from 'svelte';
import PaginaSesion from './+page.svelte';
import { M } from '$lib/mensajes/ui';
import { mensajePara } from '$lib/errores/mensajes';
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import { ejercicioBase } from '$lib/../../tests/fixtures/ejercicio-base';
import { establecerCatalogo } from '$lib/catalogo/estado';
import type { SesionCompletada, SesionEnCurso } from '$lib/motor/schema';

const estadoMock = vi.hoisted(() => ({
	perfil: null as unknown,
	gotoMock: vi.fn(),
	sonarMock: vi.fn(),
	precargarMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
	anunciarErrorMock: vi.fn(),
	vibrarMock: vi.fn(),
	reproducirSesionMock: vi.fn(),
	reproducirFondoMock: vi.fn(),
	generarSesionMock: vi.fn(),
	comenzarMock: vi.fn(),
	obtenerSesionEnCursoMock: vi.fn(),
	borrarSesionEnCursoMock: vi.fn(),
	obtenerHistorialMock: vi.fn(),
	// null salvo en el describe de resumen de cierre: ahi simula una
	// sesion en curso ya cargada, sin pasar por comenzar()/generarSesion.
	sesionActual: null as SesionEnCurso | null,
	cerrarResultado: {} as SesionCompletada,
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args),
}));

// Sonido, haptica y musica: fuera del foco del test.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
	precargar: (...args: unknown[]) => estadoMock.precargarMock(...args),
}));

vi.mock('$lib/sonido/musica', () => ({
	reproducirSesion: (...args: unknown[]) => estadoMock.reproducirSesionMock(...args),
	reproducirFondo: (...args: unknown[]) => estadoMock.reproducirFondoMock(...args),
}));

vi.mock('$lib/haptica/vibrar', () => ({
	vibrar: (...args: unknown[]) => estadoMock.vibrarMock(...args),
}));

vi.mock('$lib/errores/anunciar', () => ({
	anunciarError: (...args: unknown[]) => estadoMock.anunciarErrorMock(...args),
}));

// Fuentes de datos: mockeadas para no tocar Dexie real.
vi.mock('$lib/db/perfil', () => ({
	obtenerPerfil: () => Promise.resolve(estadoMock.perfil),
}));

vi.mock('$lib/db/estado', () => ({
	obtenerEstadosTodos: () => Promise.resolve([]),
	bloquearEjercicio: () => Promise.resolve(),
	guardarEstado: () => Promise.resolve(),
}));

vi.mock('$lib/db/sesiones', () => ({
	obtenerHistorial: (...args: unknown[]) => estadoMock.obtenerHistorialMock(...args),
	obtenerUltimaSesion: () => Promise.resolve(null),
}));

vi.mock('$lib/db/sesion-en-curso', () => ({
	obtenerSesionEnCurso: (...args: unknown[]) => estadoMock.obtenerSesionEnCursoMock(...args),
	borrarSesionEnCurso: (...args: unknown[]) => estadoMock.borrarSesionEnCursoMock(...args),
}));

vi.mock('$lib/stores/sesion.svelte', () => ({
	obtenerSesion: () => estadoMock.sesionActual,
	comenzar: (...args: unknown[]) => estadoMock.comenzarMock(...args),
	restaurar: () => {},
	completarSerie: () => {},
	corregirUltimaSerie: () => {},
	siguienteEjercicio: () => {},
	registrarDolor: () => {},
	sustituir: () => {},
	cancelar: () => {},
	cerrar: async () => estadoMock.cerrarResultado,
}));

// El generador: el test decide el plan (vacio para REQ-RUT-003).
vi.mock('$lib/motor/generador', () => ({
	generarSesion: (...args: unknown[]) => estadoMock.generarSesionMock(...args),
}));

// jsdom no trae ResizeObserver (BarraAccion lo usa en mount); stub inerte.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

describe('Plan vacio en /sesion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.sesionActual = null;
		estadoMock.gotoMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.comenzarMock.mockReset();
		estadoMock.generarSesionMock.mockReset();
		estadoMock.generarSesionMock.mockReturnValue({ plan: [], patrones_sin_pool: [] });
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.borrarSesionEnCursoMock.mockReset();
		estadoMock.borrarSesionEnCursoMock.mockResolvedValue(undefined);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	async function montarConPlanVacio(): Promise<void> {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(M.sesion.errorPlanVacio);
		});
	}

	it('plan vacio: el foco aterriza en el h1 de la pantalla', async () => {
		await montarConPlanVacio();

		const h1 = document.body.querySelector('h1');
		expect(h1).not.toBeNull();
		expect(document.activeElement).toBe(h1);
	});

	it('plan vacio: mensaje del contrato, anuncio assertive una vez y sin comenzar', async () => {
		await montarConPlanVacio();

		expect(document.body.textContent).toContain(M.sesion.errorPlanVacio);
		expect(document.body.textContent).not.toContain('No hay ejercicios disponibles para hoy');
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarAssertiveMock).toHaveBeenCalledWith(M.sesion.errorPlanVacio);
		expect(estadoMock.comenzarMock).not.toHaveBeenCalled();
	});

	it('plan vacio: la primaria "Revisar mis zonas con dolor" navega a /config/dolor', async () => {
		await montarConPlanVacio();

		const primaria = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === M.sesion.botonRevisarZonas,
		);
		expect(primaria).toBeDefined();
		primaria?.click();
		flushSync();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/config/dolor');
	});

	it('plan vacio: una sola "Volver al inicio" (el BotonVolver superior)', async () => {
		await montarConPlanVacio();

		const volverInicio = Array.from(document.body.querySelectorAll('button')).filter(
			(b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === M.sesion.botonVolverInicio,
		);
		expect(volverInicio.length).toBe(1);
	});

	it('otro error de generacion (Dexie): conserva el boton inline a / y no genera', async () => {
		// La rama {:else} del bloque de error (otra causa que el plan
		// vacio) debe conservar su comportamiento actual: boton inline
		// "Volver al inicio" -> '/'. El caso "sin perfil" no es
		// alcanzable aca: la guarda !perfil corta antes y el layout
		// redirige a /onboarding; el error de Dexie es la "otra causa"
		// viva del escenario REQ-RUT-016.
		estadoMock.obtenerHistorialMock.mockRejectedValue({ code: 'ERR-DB-READ' });
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(mensajePara('ERR-DB-READ'));
		});

		expect(estadoMock.generarSesionMock).not.toHaveBeenCalled();
		const inline = Array.from(document.body.querySelectorAll('button')).find(
			(b) => b.textContent?.trim() === M.sesion.botonVolverInicio,
		);
		expect(inline).toBeDefined();
		inline?.click();
		flushSync();

		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/');
	});
});

describe('Resumen de cierre: ejercicios sin series completadas', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		// Una sesion en curso ya cargada en memoria, en su ultimo (unico)
		// ejercicio: alcanza con completar esa serie para que el cierre
		// dispare. Sin catalogo cargado, la pantalla cae al id crudo por
		// ejercicio; sirve igual para distinguir cual entro a la lista.
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-hecho', series: 1, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
			],
			indice_ejercicio: 0,
			indice_serie: 0,
			ejecutados: [],
			cancelada_por_dolor: false,
		};
		// Lo que devuelve el cierre no depende de la sesion de arriba (esta
		// mockeado): incluye el ejecutado sin series que dejo registrarZonasDolor
		// (dolor.ts) junto a uno hecho de verdad.
		estadoMock.cerrarResultado = {
			id: 'sesion-test-cierre',
			fecha: Date.now(),
			tipo: 'FULL_BODY',
			duracion_minutos: 5,
			cancelada_por_dolor: false,
			ejercicios: [
				{
					ejercicio_id: 'ej-dolor-sin-series',
					series_planificadas: 3,
					series_completadas: 0,
					reps_planificadas: 10,
					reps_reales: [],
					rir_declarado: [],
					zonas_dolor_reportadas: ['hombros'],
				},
				{
					ejercicio_id: 'ej-hecho',
					series_planificadas: 1,
					series_completadas: 1,
					reps_planificadas: 10,
					reps_reales: [10],
					rir_declarado: [null],
					zonas_dolor_reportadas: [],
				},
			],
		};
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		estadoMock.sesionActual = null;
	});

	it('el ejecutado con cero series no entra a "Ejercicios que hiciste"', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();

		const boton = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.botonSerieTerminada,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		boton.click();
		flushSync();

		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(M.sesion.ejerciciosHechosTitulo);
		});
		expect(document.body.textContent).toContain('ej-hecho');
		expect(document.body.textContent).not.toContain('ej-dolor-sin-series');
	});
});

describe('Foco al arrancar el sosten de un ejercicio en segundos', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		establecerCatalogo([ejercicioBase({ id: 'ej-plancha', nombre: 'Plancha', medido_en: 'segundos' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-plancha', series: 1, reps_objetivo: 30, rir_objetivo: 2, descanso_segundos: 60 },
			],
			indice_ejercicio: 0,
			indice_serie: 0,
			ejecutados: [],
			cancelada_por_dolor: false,
		};
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		estadoMock.sesionActual = null;
		establecerCatalogo([]);
	});

	it('al pulsar Empezar, el foco aterriza en el encabezado del sosten', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();

		const boton = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.sostenerEmpezar,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		boton.click();
		flushSync();

		const h2 = Array.from(document.body.querySelectorAll('h2')).find((el) =>
			el.textContent?.startsWith(M.sesion.sostenerEtiqueta),
		);
		expect(h2).not.toBeUndefined();
		expect(document.activeElement).toBe(h2);
	});
});
