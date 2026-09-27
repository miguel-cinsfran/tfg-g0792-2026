// @vitest-environment jsdom
//
// Plan vacio en /sesion (REQ-RUT-003): cuando generarSesion devuelve un
// plan vacio, la ruta muestra el mensaje del contrato (M.sesion.
// errorPlanVacio, sin literal), lo anuncia assertive UNA vez, ofrece
// como primaria "Revisar mis zonas con dolor" -> /config/dolor y deja
// una sola "Volver al inicio" (el BotonVolver superior). No llama a
// comenzar. Otros errores (sin perfil, REQ-RUT-016) se conservan.
//
// Resumen de cierre: un ejecutado con cero series
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
import type { SesionEnCursoGuardada } from '$lib/db/db';

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
	registrarDolorMock: vi.fn(),
	corregirDolorMock: vi.fn(),
	obtenerSesionEnCursoMock: vi.fn(),
	borrarSesionEnCursoMock: vi.fn(),
	obtenerHistorialMock: vi.fn(),
	progresarMock: vi.fn(),
	evaluarMock: vi.fn(),
	guardarEstadoMock: vi.fn(),
	// null salvo en el describe de resumen de cierre: ahi simula una
	// sesion en curso ya cargada, sin pasar por comenzar()/generarSesion.
	sesionActual: null as SesionEnCurso | null,
	cerrarResultado: {} as SesionCompletada,
	cerrarMock: vi.fn(),
	restaurarMock: vi.fn(),
	descartarMock: vi.fn(),
	cancelarMock: vi.fn(),
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
	ampliarBloqueo: () => Promise.resolve(),
	guardarEstado: (...args: unknown[]) => estadoMock.guardarEstadoMock(...args),
}));

vi.mock('$lib/motor/progresion', () => ({
	progresar: (...args: unknown[]) => estadoMock.progresarMock(...args),
}));

vi.mock('$lib/motor/progresion-sugerida', () => ({
	evaluarProgresionesSugeridas: (...args: unknown[]) => estadoMock.evaluarMock(...args),
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
	restaurar: (...args: unknown[]) => estadoMock.restaurarMock(...args),
	completarSerie: () => {},
	corregirUltimaSerie: () => {},
	siguienteEjercicio: () => {},
	registrarDolor: (...args: unknown[]) => estadoMock.registrarDolorMock(...args),
	corregirDolor: (...args: unknown[]) => estadoMock.corregirDolorMock(...args),
	sustituir: () => {},
	cancelar: (...args: unknown[]) => estadoMock.cancelarMock(...args),
	descartar: (...args: unknown[]) => estadoMock.descartarMock(...args),
	cerrar: async (...args: unknown[]) => {
		estadoMock.cerrarMock(...args);
		return estadoMock.cerrarResultado as SesionCompletada;
	},
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

// La segunda confirmacion del reporte de dolor ("Revisar mis zonas")
// corrige las zonas, no las acumula: si no, el registro de la serie
// contradice la razon del bloqueo. El cableado
// correcto es corregirDolor (no registrarDolor) con las zonas previas
// de ESE reporte. Este test rompe si la pagina vuelve a acumular.
describe('Segunda confirmacion de zonas de dolor', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		estadoMock.registrarDolorMock.mockReset();
		estadoMock.corregirDolorMock.mockReset();
		establecerCatalogo([ejercicioBase({ id: 'ej-a' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
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

	function buscarBoton(texto: string): HTMLButtonElement | undefined {
		return Array.from(document.body.querySelectorAll('button')).find(
			(el) => el.textContent?.trim() === texto,
		);
	}

	function checkboxZona(zona: string): HTMLInputElement {
		return document.querySelector(
			`input[name="zonas-dolor"][value="${zona}"]`,
		) as HTMLInputElement;
	}

	it('tras revisar y quitar una zona, la segunda confirmacion llama a corregirDolor con previas y confirmadas', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		// Deja que el liveQuery de obtenerPerfil entregue el perfil antes
		// de interactuar: manejarConfirmarZonas corta sin el.
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		const reportar = await vi.waitFor(() => {
			const b = buscarBoton(M.sesion.botonReportarDolor);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		reportar.click();
		flushSync();

		// Primera confirmacion: hombros. Acumula (registrarDolor).
		checkboxZona('hombros').click();
		flushSync();
		buscarBoton(M.sesion.botonConfirmar)?.click();
		flushSync();
		expect(estadoMock.registrarDolorMock).toHaveBeenCalledTimes(1);

		// Sin sustituto disponible el flujo va a DOLOR_POOL; "Revisar mis
		// zonas" reabre el selector con la seleccion previa.
		const revisar = await vi.waitFor(() => {
			const b = buscarBoton(M.sesion.botonRevisarZonas);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		revisar.click();
		flushSync();

		// Quitar hombros, agregar codos.
		checkboxZona('hombros').click();
		checkboxZona('codos').click();
		flushSync();

		const confirmar2 = buscarBoton(M.sesion.botonConfirmar);
		confirmar2?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(estadoMock.corregirDolorMock).toHaveBeenCalledWith(
				['hombros'],
				['codos'],
				expect.any(Number),
			);
		});
		// La segunda confirmacion corrige, no vuelve a acumular.
		expect(estadoMock.registrarDolorMock).toHaveBeenCalledTimes(1);
	});
});

// Omitir un patron anuncia que se salto el ejercicio. El anuncio es
// POLITE: el foco cae en el ejercicio
// siguiente y el lector lo lee primero; assertive interrumpiria esa
// lectura. El texto exacto vive en M.sesion.patronOmitido.
describe('Omitir patron desde DOLOR_POOL', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.registrarDolorMock.mockReset();
		establecerCatalogo([ejercicioBase({ id: 'ej-a' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
				{ ejercicio_id: 'ej-b', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
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

	it('al omitir el patron se anuncia "Patron omitido" por la region polite', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		// Deja que los liveQuery entreguen el perfil antes de interactuar.
		await new Promise((r) => setTimeout(r, 0));
		flushSync();

		const reportar = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.botonReportarDolor,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		reportar.click();
		flushSync();

		(document.querySelector('input[name="zonas-dolor"][value="hombros"]') as HTMLInputElement).click();
		flushSync();
		Array.from(document.body.querySelectorAll('button'))
			.find((el) => el.textContent?.trim() === M.sesion.botonConfirmar)
			?.click();
		flushSync();

		const omitir = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.botonOmitirPatron,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		omitir.click();
		flushSync();

		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(M.sesion.patronOmitido);
		expect(estadoMock.anunciarAssertiveMock).not.toHaveBeenCalledWith(M.sesion.patronOmitido);
	});
});

// Al reanudar una sesion que quedo en el descanso (la app se cerro
// entre series), la pantalla pasa a la serie siguiente y dice que el
// descanso ya concluyo. Polite, igual que el
// anuncio de omitir: el foco lee el ejercicio y el anuncio llega despues.
describe('Reanudar sesion guardada', () => {
	let instancia: ReturnType<typeof mount>;

	function respaldoCon(sesion: SesionEnCurso): SesionEnCursoGuardada {
		return { id: 1, sesion, guardada_en: Date.now() };
	}

	// Serie 1 completada de 3: la app se cerro durante el descanso.
	function sesionEnDescanso(): SesionEnCurso {
		return {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
			],
			indice_ejercicio: 0,
			indice_serie: 1,
			ejecutados: [
				{
					ejercicio_id: 'ej-a',
					series_planificadas: 3,
					series_completadas: 1,
					reps_planificadas: 10,
					reps_reales: [9],
					rir_declarado: [null],
					zonas_dolor_reportadas: [],
				},
			],
			cancelada_por_dolor: false,
		};
	}

	// Ninguna serie completada: no venia del descanso.
	function sesionEnSerieNueva(): SesionEnCurso {
		return {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
			],
			indice_ejercicio: 0,
			indice_serie: 0,
			ejecutados: [],
			cancelada_por_dolor: false,
		};
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.sesionActual = null;
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	async function montarConRespaldo(sesion: SesionEnCurso): Promise<void> {
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(respaldoCon(sesion));
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.botonReanudar,
			);
			expect(b).toBeDefined();
		});
	}

	function pulsarReanudar(): void {
		const boton = Array.from(document.body.querySelectorAll('button')).find(
			(el) => el.textContent?.trim() === M.sesion.botonReanudar,
		);
		boton?.click();
		flushSync();
	}

	it('sesion a mitad de ejercicio: anuncia el fin del descanso en vez de la retomada', async () => {
		await montarConRespaldo(sesionEnDescanso());
		pulsarReanudar();

		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(M.sesion.tiempoDescansoConcluido);
		expect(estadoMock.anunciarPoliteMock).not.toHaveBeenCalledWith(M.sesion.anuncioReanudada);
	});

	it('sesion en serie nueva: sigue anunciando la retomada', async () => {
		await montarConRespaldo(sesionEnSerieNueva());
		pulsarReanudar();

		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(M.sesion.anuncioReanudada);
		expect(estadoMock.anunciarPoliteMock).not.toHaveBeenCalledWith(M.sesion.tiempoDescansoConcluido);
	});
});

// Sugerencia de progresion: canal assertive para errores.
// La rama sin cambio (motor responde extremo) y la del catch deben anunciar
// por la region global; el parrafo ya no lleva role propio.
describe('Sugerencia de progresion: anuncio de error', () => {
	let instancia: ReturnType<typeof mount>;

	function crearRegion() {
		const live = document.createElement('div');
		live.id = 'live-assertive';
		live.setAttribute('role', 'alert');
		live.setAttribute('aria-live', 'assertive');
		document.body.appendChild(live);
		return live;
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		crearRegion();
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		estadoMock.anunciarAssertiveMock.mockReset();
		estadoMock.anunciarErrorMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.progresarMock.mockReset();
		estadoMock.guardarEstadoMock.mockReset();
		estadoMock.evaluarMock.mockReset();
		// usar implementacion real con retardo para probar #live-assertive
		estadoMock.anunciarAssertiveMock.mockImplementation((msg: string) => {
			const region = document.getElementById('live-assertive');
			if (!region) return;
			region.textContent = '';
			setTimeout(() => { region.textContent = msg as string; }, 50);
		});
		estadoMock.anunciarErrorMock.mockImplementation((code: string) => {
			const region = document.getElementById('live-assertive');
			if (!region) return;
			const msg = mensajePara(code);
			region.textContent = '';
			setTimeout(() => { region.textContent = msg; }, 50);
		});
		estadoMock.guardarEstadoMock.mockResolvedValue(undefined);
		establecerCatalogo([ejercicioBase({ id: 'ej-a', progresion_id: null }), ejercicioBase({ id: 'ej-b', progresion_id: 'ej-c' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [{ ejercicio_id: 'ej-a', series: 1, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 }],
			indice_ejercicio: 0,
			indice_serie: 0,
			ejecutados: [],
			cancelada_por_dolor: false,
		};
		estadoMock.cerrarResultado = {
			id: 'sesion-test-cierre',
			fecha: Date.now(),
			tipo: 'FULL_BODY',
			duracion_minutos: 5,
			cancelada_por_dolor: false,
			ejercicios: [{ ejercicio_id: 'ej-a', series_planificadas: 1, series_completadas: 1, reps_planificadas: 10, reps_reales: [10], rir_declarado: [null], zonas_dolor_reportadas: [] }],
		};
		// una sugerencia disponible
		estadoMock.evaluarMock.mockReturnValue([{ ejercicio: { id: 'ej-a', nombre: 'Flexion', progresion_id: null } }]);
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		estadoMock.sesionActual = null;
		establecerCatalogo([]);
		vi.useRealTimers();
	});

	async function llevarACierreConSugerencia(): Promise<void> {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		const boton = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find((el) => el.textContent?.trim() === M.sesion.botonSerieTerminada);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		boton.click();
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(M.sesion.sugerenciaProgresionTitulo);
		});
	}

	it('progresion sin cambio: anuncia por assertive y muestra el texto sin role alert', async () => {
		vi.useFakeTimers();
		estadoMock.progresarMock.mockReturnValue({ tipo: 'extremo' });
		await llevarACierreConSugerencia();
		const botonSi = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === M.sesion.sugerenciaProgresionBotonSi) as HTMLButtonElement;
		expect(botonSi).toBeDefined();
		botonSi.click();
		flushSync();
		await vi.advanceTimersByTimeAsync(60);
		flushSync();
		const region = document.getElementById('live-assertive') as HTMLElement;
		expect(region.textContent).toBe(M.sesion.sugerenciaProgresionError);
		const parrafo = Array.from(document.body.querySelectorAll('p')).find((p) => p.textContent === M.sesion.sugerenciaProgresionError) as HTMLElement;
		expect(parrafo).toBeDefined();
		expect(parrafo.getAttribute('role')).toBeNull();
	});

	it('fallo al guardar: anuncia el mensaje del codigo por assertive y sin role alert', async () => {
		vi.useFakeTimers();
		estadoMock.progresarMock.mockReturnValue({ tipo: 'cambio', destino: { id: 'ej-c', nombre: 'Fondo' }, estado_nuevo: { ejercicio_id: 'ej-c' } });
		estadoMock.guardarEstadoMock.mockRejectedValue({ code: 'ERR-DB-WRITE' });
		await llevarACierreConSugerencia();
		const botonSi = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.trim() === M.sesion.sugerenciaProgresionBotonSi) as HTMLButtonElement;
		expect(botonSi).toBeDefined();
		botonSi.click();
		flushSync();
		await vi.advanceTimersByTimeAsync(60);
		flushSync();
		const region = document.getElementById('live-assertive') as HTMLElement;
		expect(region.textContent).toBe(mensajePara('ERR-DB-WRITE'));
		const parrafo = Array.from(document.body.querySelectorAll('p')).find((p) => p.textContent === mensajePara('ERR-DB-WRITE')) as HTMLElement;
		expect(parrafo).toBeDefined();
		expect(parrafo.getAttribute('role')).toBeNull();
	});
});

// Terminar la sesion antes de su final.
describe('Terminar la sesion', () => {
	let instancia: ReturnType<typeof mount>;

	const BOTON = M.sesion.botonTerminarSesion;
	const TITULO = M.sesion.tituloTerminarSesion;
	const CON_SERIES = M.sesion.textoTerminarConSeries;
	const SIN_SERIES = M.sesion.textoTerminarSinSeries;
	const SI_TERMINAR = M.sesion.botonConfirmarTerminar;
	const SEGUIR = M.sesion.botonSeguirEntrenando;
	const DESCARTADA = M.sesion.anuncioSesionDescartada;

	function respaldoCon(sesion: SesionEnCurso): SesionEnCursoGuardada {
		return { id: 1, sesion, guardada_en: Date.now() };
	}

	function sesionConEjecutados(ejecutados: SesionEnCurso['ejecutados']): SesionEnCurso {
		return {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
			],
			indice_ejercicio: 0,
			indice_serie: 1,
			ejecutados,
			cancelada_por_dolor: false,
		};
	}

	function ejecutadoCon(series: number) {
		return {
			ejercicio_id: 'ej-a',
			series_planificadas: 3,
			series_completadas: series,
			reps_planificadas: 10,
			reps_reales: series > 0 ? [10] : [],
			rir_declarado: series > 0 ? [null] : [],
			zonas_dolor_reportadas: [],
		};
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.sesionActual = null;
		estadoMock.gotoMock.mockReset();
		estadoMock.cerrarMock.mockReset();
		estadoMock.restaurarMock.mockReset();
		estadoMock.descartarMock.mockReset();
		estadoMock.cancelarMock.mockReset();
		estadoMock.anunciarPoliteMock.mockReset();
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.borrarSesionEnCursoMock.mockReset();
		estadoMock.borrarSesionEnCursoMock.mockResolvedValue(undefined);
		estadoMock.restaurarMock.mockImplementation((s: SesionEnCurso) => {
			estadoMock.sesionActual = s;
		});
		estadoMock.descartarMock.mockImplementation(() => {
			estadoMock.sesionActual = null;
		});
		establecerCatalogo([ejercicioBase({ id: 'ej-a' })]);
		estadoMock.cerrarResultado = {
			id: 'sesion-test-terminar',
			fecha: Date.now(),
			tipo: 'FULL_BODY',
			duracion_minutos: 5,
			cancelada_por_dolor: false,
			ejercicios: [],
		};
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		estadoMock.sesionActual = null;
		establecerCatalogo([]);
		estadoMock.restaurarMock.mockReset();
		estadoMock.descartarMock.mockReset();
	});

	function buscarBoton(texto: string): HTMLButtonElement | undefined {
		return Array.from(document.body.querySelectorAll('button')).find(
			(el) => el.textContent?.trim() === texto,
		);
	}

	function dialogo(): HTMLElement | null {
		return document.body.querySelector('[role="dialog"]');
	}

	async function montarEnEjercicio(conSeries: boolean): Promise<void> {
		estadoMock.sesionActual = sesionConEjecutados(conSeries ? [ejecutadoCon(1)] : []);
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			expect(buscarBoton(BOTON)).toBeDefined();
		});
	}

	async function montarEnReanudar(conSeries: boolean): Promise<void> {
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(
			respaldoCon(sesionConEjecutados(conSeries ? [ejecutadoCon(1)] : [])),
		);
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			expect(buscarBoton(BOTON)).toBeDefined();
		});
	}

	it('al tocar Terminar la sesión se abre un diálogo con el título del contrato', async () => {
		await montarEnEjercicio(true);
		buscarBoton(BOTON)?.click();
		flushSync();
		expect(dialogo()?.textContent).toContain(TITULO);
	});

	it('con una serie completada, confirmar lleva al resumen de cierre sin marcar cancelada_por_dolor', async () => {
		await montarEnEjercicio(true);
		buscarBoton(BOTON)?.click();
		flushSync();
		expect(dialogo()?.textContent).toContain(CON_SERIES);
		buscarBoton(SI_TERMINAR)?.click();
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(M.sesion.anuncioSesionCompletada);
		});
		expect(estadoMock.cerrarMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.cancelarMock).not.toHaveBeenCalled();
		expect(estadoMock.cerrarResultado.cancelada_por_dolor).toBe(false);
	});

	it('con cero series, confirmar no cierra ni guarda, anuncia y navega a la portada', async () => {
		await montarEnEjercicio(false);
		buscarBoton(BOTON)?.click();
		flushSync();
		expect(dialogo()?.textContent).toContain(SIN_SERIES);
		buscarBoton(SI_TERMINAR)?.click();
		flushSync();
		await vi.waitFor(() => {
			expect(estadoMock.gotoMock).toHaveBeenCalledWith('/');
		});
		expect(estadoMock.cerrarMock).not.toHaveBeenCalled();
		expect(estadoMock.descartarMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith(DESCARTADA);
	});

	it('Seguir entrenando no cierra la sesión y el diálogo desaparece', async () => {
		await montarEnEjercicio(true);
		buscarBoton(BOTON)?.click();
		flushSync();
		expect(dialogo()).not.toBeNull();
		buscarBoton(SEGUIR)?.click();
		flushSync();
		expect(dialogo()).toBeNull();
		expect(estadoMock.cerrarMock).not.toHaveBeenCalled();
		expect(buscarBoton(M.sesion.botonSerieTerminada)).toBeDefined();
	});

	it('desde REANUDAR con series en el respaldo, confirmar restaura y cierra', async () => {
		await montarEnReanudar(true);
		buscarBoton(BOTON)?.click();
		flushSync();
		expect(dialogo()?.textContent).toContain(CON_SERIES);
		buscarBoton(SI_TERMINAR)?.click();
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain(M.sesion.anuncioSesionCompletada);
		});
		expect(estadoMock.restaurarMock).toHaveBeenCalledTimes(1);
		expect(estadoMock.cerrarMock).toHaveBeenCalledTimes(1);
	});
});

// Rótulo en DESCANSO: en descanso normal dice "Descanso"; al tocar
// "Corregir cantidad" pasa a "Corregir cantidad" (M.sesion.corregirTitulo).
describe('Rótulo al corregir en DESCANSO', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		establecerCatalogo([ejercicioBase({ id: 'ej-a' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
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

	function buscarBoton(texto: string): HTMLButtonElement | undefined {
		return Array.from(document.body.querySelectorAll('button')).find(
			(el) => el.textContent?.trim() === texto,
		);
	}

	// El h1 dice donde estas: en descanso es Descanso, al corregir
	// es Corregir cantidad.
	function rotulo(): string {
		return document.body.querySelector('h1')?.textContent?.trim() ?? '';
	}

	// Sin chequeo, cerrar la serie va directo a DESCANSO (POST_SERIE solo
	// sale con la pregunta de esfuerzo).
	async function llegarADescanso(): Promise<void> {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();
		const serie = await vi.waitFor(() => {
			const b = buscarBoton(M.sesion.botonSerieTerminada);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		serie.click();
		flushSync();
		await vi.waitFor(() => {
			expect(buscarBoton(M.sesion.botonSaltarDescanso)).toBeDefined();
		});
	}

	it('en descanso el rótulo dice Descanso', async () => {
		await llegarADescanso();
		expect(rotulo()).toBe(M.sesion.descansoTitulo);
	});

	it('al tocar Corregir cantidad el rótulo dice Corregir cantidad', async () => {
		await llegarADescanso();
		buscarBoton(M.sesion.botonAjustarReps)?.click();
		flushSync();
		expect(rotulo()).toBe(M.sesion.corregirTitulo);
	});

	it('debajo del tiempo dice que viene despues: ejercicio y serie', async () => {
		await llegarADescanso();
		// El store mockeado no avanza indice_serie al cerrar (en la app
		// real ya avanzo): con indice 0, la siguiente es la serie 1 de 2.
		expect(document.body.textContent).toContain('Después: Ejercicio de prueba, serie 1 de 2');
	});

	it('+30 segundos suma 30 al restante y lo anuncia', async () => {
		await llegarADescanso();
		buscarBoton(M.sesion.botonSumarDescanso)?.click();
		flushSync();
		expect(document.body.textContent).toContain('Descanso: 90 segundos');
		expect(estadoMock.anunciarPoliteMock).toHaveBeenCalledWith('Descanso: 1 minuto 30 segundos');
	});
});

// El h1 dice donde estas: nombre del ejercicio, Descanso, Reportar
// dolor o Corregir cantidad. El progreso sigue debajo como siempre.
describe('h1 de fase en /sesion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.obtenerSesionEnCursoMock.mockReset();
		estadoMock.obtenerSesionEnCursoMock.mockResolvedValue(null);
		estadoMock.obtenerHistorialMock.mockReset();
		estadoMock.obtenerHistorialMock.mockResolvedValue([]);
		establecerCatalogo([ejercicioBase({ id: 'ej-a', nombre: 'Sentadilla de prueba' })]);
		estadoMock.sesionActual = {
			tipo: 'FULL_BODY',
			fecha_inicio: Date.now(),
			plan: [
				{ ejercicio_id: 'ej-a', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 60 },
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

	function h1(): string {
		return document.body.querySelector('h1')?.textContent?.trim() ?? '';
	}

	it('en ejercicio el h1 es el nombre del ejercicio y el foco cae ahi', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();

		await vi.waitFor(() => {
			expect(h1()).toBe('Sentadilla de prueba');
		});
		expect(document.activeElement).toBe(document.body.querySelector('h1'));
		expect(document.body.textContent).toContain(M.sesion.progresoEjercicio(1, 1));
		expect(document.body.textContent).toContain(M.sesion.progresoSerie(1, 2));
	});

	it('al reportar dolor el h1 es Reportar dolor', async () => {
		instancia = mount(PaginaSesion, { target: document.body });
		flushSync();

		const boton = await vi.waitFor(() => {
			const b = Array.from(document.body.querySelectorAll('button')).find(
				(el) => el.textContent?.trim() === M.sesion.botonReportarDolor,
			);
			expect(b).toBeDefined();
			return b as HTMLButtonElement;
		});
		boton.click();
		flushSync();

		await vi.waitFor(() => {
			expect(h1()).toBe(M.sesion.botonReportarDolor);
		});
		expect(document.activeElement).toBe(document.body.querySelector('h1'));
	});
});
