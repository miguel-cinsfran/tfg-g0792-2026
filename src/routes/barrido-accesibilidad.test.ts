// @vitest-environment jsdom
//
// Barrido de accesibilidad de TODAS las pantallas. Para
// cada +page.svelte descubierto bajo src/routes/ se monta la pantalla y
// se verifican las mismas reglas mecanicas: exactamente un h1, encabezados
// sin salto de nivel, controles con nombre accesible y axe A/AA con la
// misma configuracion de axe-componentes.test.ts.
//
// La lista de pantallas se descubre del sistema de archivos
// (import.meta.glob): agregar una ruta nueva la cubre sola, sin editar
// esta lista. Las pantallas que no pueden montarse o que hoy no pasan
// van a EXCLUIDOS con un motivo de una linea. El caso final compara lo
// descubierto contra lo cubierto mas lo excluido: si manana aparece una
// pantalla que no esta en ninguno de los dos, se pone en rojo nombrandola.
//
// Una pantalla cuenta como "cubierta" cuando supera la regla del h1 (el
// contrato base de toda pantalla). Las reglas 2-4 tienen su propio caso
// por pantalla: si fallan, ese caso la nombra sin depender del guard.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import type { Component } from 'svelte';
import axe from 'axe-core';
import { reiniciar as reiniciarOnboarding, actualizar as actualizarOnboarding } from '$lib/onboarding/estado';
import { popularCatalogo } from '$lib/catalogo/cargar';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import { AHORA } from '$lib/../../tests/fixtures/ahora';

// jsdom no trae ResizeObserver, que Svelte usa para bind:clientHeight en
// BarraAccion (presente en las pantallas de sesion y onboarding).
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

const estadoMock = vi.hoisted(() => ({
	perfil: null as unknown,
	gotoMock: vi.fn(),
	onNavigateMock: vi.fn(),
	anunciarPoliteMock: vi.fn(),
	anunciarAssertiveMock: vi.fn(),
	anunciarErrorMock: vi.fn(),
	sonarMock: vi.fn(),
	precargarMock: vi.fn(),
	musicaFondoMock: vi.fn(),
	musicaSesionMock: vi.fn(),
	pausarMusicaMock: vi.fn(),
	reanudarMusicaMock: vi.fn(),
	vibrarMock: vi.fn(),
	esPlataformaNativa: false,
	paramsId: 'ej-001-push-h-flexion-pared',
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
	onNavigate: (...args: unknown[]) => estadoMock.onNavigateMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$app/state', () => ({
	page: {
		url: {
			pathname: '/',
			searchParams: new URLSearchParams(),
		},
		get params() {
			return { id: estadoMock.paramsId };
		},
	},
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: (...args: unknown[]) => estadoMock.anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => estadoMock.anunciarAssertiveMock(...args),
}));

vi.mock('$lib/errores/anunciar', () => ({
	anunciarError: (...args: unknown[]) => estadoMock.anunciarErrorMock(...args),
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
	precargar: (...args: unknown[]) => estadoMock.precargarMock(...args),
	sonidosActivados: () => true,
	establecerSonidos: () => {},
	volumenEfectos: () => 1,
	establecerVolumenEfectos: () => {},
}));

vi.mock('$lib/sonido/musica', () => ({
	reproducirFondo: (...args: unknown[]) => estadoMock.musicaFondoMock(...args),
	reproducirSesion: (...args: unknown[]) => estadoMock.musicaSesionMock(...args),
	pausar: (...args: unknown[]) => estadoMock.pausarMusicaMock(...args),
	reanudar: (...args: unknown[]) => estadoMock.reanudarMusicaMock(...args),
	musicaActivada: () => false,
	establecerMusicaActivada: () => {},
	volumenMusica: () => 0.15,
	establecerVolumenMusica: () => {},
}));

vi.mock('$lib/haptica/vibrar', () => ({
	vibrar: (...args: unknown[]) => estadoMock.vibrarMock(...args),
}));

// Plugins de Capacitor que se importan desde las rutas (compartir,
// pantalla encendida): en jsdom el bridge nativo no existe.
vi.mock('@capacitor/core', () => ({
	Capacitor: { isNativePlatform: () => estadoMock.esPlataformaNativa },
}));

vi.mock('@capacitor/filesystem', () => ({
	Filesystem: { writeFile: () => Promise.resolve({ uri: 'file:///tmp/x.json' }) },
	Directory: { Cache: 'CACHE' },
	Encoding: { UTF8: 'utf8' },
}));

vi.mock('@capacitor/share', () => ({
	Share: { share: () => Promise.resolve() },
}));

vi.mock('@capacitor-community/keep-awake', () => ({
	KeepAwake: { keepAwake: () => Promise.resolve(), allowSleep: () => Promise.resolve() },
}));

// Fuentes de datos: mockeadas para que cada pantalla rinda su estado
// estable (perfil valido, historial vacio) sin tocar Dexie real.
vi.mock('$lib/db/perfil', () => ({
	obtenerPerfil: () => Promise.resolve(estadoMock.perfil),
	guardarPerfil: () => Promise.resolve(1),
	actualizarPerfil: () => Promise.resolve(1),
	borrarPerfil: () => Promise.resolve(),
	restablecerBase: () => Promise.resolve(),
	marcarPrimeraSesion: () => Promise.resolve(1),
}));

vi.mock('$lib/db/estado', () => ({
	PREFIJO_RAZON_DOLOR: 'Dolor en ',
	obtenerEstadosTodos: () => Promise.resolve([]),
	obtenerEstado: () => Promise.resolve(undefined),
	obtenerEstadosBloqueados: () => Promise.resolve([]),
	actualizarFechaUltimoUso: () => Promise.resolve(1),
	guardarEstado: () => Promise.resolve(),
	bloquearEjercicio: () => Promise.resolve(),
	ampliarBloqueo: () => Promise.resolve(),
	reprogramarRevision: () => Promise.resolve(),
	marcarResuelto: () => Promise.resolve(),
}));

vi.mock('$lib/db/sesiones', () => ({
	obtenerHistorial: () => Promise.resolve([]),
	obtenerUltimaSesion: () => Promise.resolve(undefined),
	cerrarSesion: () => Promise.resolve(),
}));

vi.mock('$lib/db/dolor', () => ({
	obtenerHistorialDolor: () => Promise.resolve([]),
}));

vi.mock('$lib/db/sesion-en-curso', () => ({
	obtenerSesionEnCurso: () => Promise.resolve(null),
	borrarSesionEnCurso: () => Promise.resolve(),
	guardarSesionEnCurso: () => Promise.resolve(),
}));

// La maquina de sesion es logica viva en page.test.ts de /sesion; aca el
// barrido solo necesita que la pantalla rinda un estado estable (plan
// vacio -> REQ-RUT-003) sin transiciones.
vi.mock('$lib/stores/sesion.svelte', () => ({
	obtenerSesion: () => null,
	comenzar: () => {},
	restaurar: () => {},
	completarSerie: () => {},
	corregirUltimaSerie: () => {},
	siguienteEjercicio: () => {},
	registrarDolor: () => {},
	corregirDolor: () => {},
	sustituir: () => {},
	cancelar: () => {},
	descartar: () => {},
	cerrar: async () => ({}),
}));

vi.mock('$lib/motor/generador', () => ({
	generarSesion: () => ({ plan: [], patrones_sin_pool: [] }),
}));

type CargadorPantalla = () => Promise<Component>;
const MODULOS = import.meta.glob<Component>('./**/+page.svelte', { import: 'default' });

type Pantalla = { nombre: string; cargar: CargadorPantalla };

// './ayuda/+page.svelte' -> 'ayuda'; la raiz ('./+page.svelte') -> '/'.
function nombreDeClave(clave: string): string {
	const sinPrefijo = clave.replace(/^\.\//, '').replace(/\/\+page\.svelte$/, '');
	return sinPrefijo === '' ? '/' : sinPrefijo;
}

const PANTALLAS: Pantalla[] = Object.entries(MODULOS).map(([clave, cargar]) => ({
	nombre: nombreDeClave(clave),
	cargar,
}));

// Pantallas fuera del barrido. Cada una con su motivo de una linea;
// salen de la lista cuando el motivo desaparezca.
const EXCLUIDOS = new Set<string>([]);

// Estado de onboarding completo: los pasos rinden sus campos prefillados
// y el resumen puede evaluar nivel sin nulls (evaluarNivelInicial).
function prepararOnboarding(): void {
	reiniciarOnboarding();
	actualizarOnboarding({
		disclaimer_aceptado: true,
		fecha_aceptacion_disclaimer: AHORA,
		nombre: 'Persona de prueba',
		anio_nacimiento: 1995,
		peso_kg: 70,
		altura_cm: 175,
		objetivo: 'fuerza',
		tiene_anclaje: true,
		zonas_dolor_preexistente: [],
		dias_semana: 3,
		duracion_sesion_min: 30,
		reps_push: 15,
		reps_pull: 10,
		reps_legs: 20,
		segundos_core: 60,
	});
}

const PREPARACION: Record<string, () => void> = {};
for (const nombre of [
	'onboarding',
	'onboarding/disclaimer',
	'onboarding/datos',
	'onboarding/objetivo',
	'onboarding/equipamiento',
	'onboarding/dolor-preexistente',
	'onboarding/disponibilidad',
	'onboarding/evaluacion/push',
	'onboarding/evaluacion/pull',
	'onboarding/evaluacion/legs',
	'onboarding/evaluacion/core',
	'onboarding/resumen',
]) {
	PREPARACION[nombre] = prepararOnboarding;
}

const CUBIERTAS = new Set<string>();

// Misma configuracion que axe-componentes.test.ts: un solo criterio de
// "accesible" en el repositorio. color-contrast y target-size dependen
// de layout real y jsdom no hace layout (el contraste se verifica aparte
// en contraste-tokens.test.ts; el target de 48px via min-h-12/min-w-12).
const OPCIONES_AXE: axe.RunOptions = {
	runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
	},
};

function describirViolaciones(v: axe.Result[]): string {
	return v
		.map((r) => `${r.id}: ${r.help} -> ${r.nodes.map((n) => n.html).join(' | ')}`)
		.join('\n');
}

// Controles con regla de nombre en axe-core: botones, enlaces, campos y
// roles ARIA equivalentes. Los nativos deshabilitados se filtran abajo.
const SELECTOR_INTERACTIVO = [
	'button',
	'summary',
	'[role="button"]',
	'a[href]',
	'[role="link"]',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'[role="checkbox"]',
	'[role="radio"]',
	'[role="combobox"]',
	'[role="textbox"]',
	'[role="searchbox"]',
	'[role="slider"]',
	'[role="spinbutton"]',
	'[role="switch"]',
	'[role="listbox"]',
	'[role="menuitem"]',
	'[role="menuitemcheckbox"]',
	'[role="menuitemradio"]',
	'[role="tab"]',
	'[role="treeitem"]',
	'[role="option"]',
].join(', ');

// Catalogo real en memoria (popularCatalogo valida el JSON): asi la lista
// /biblioteca y el detalle /biblioteca/[id] rinden contenido de verdad.
popularCatalogo(catalogoRaw);

let instancia: ReturnType<typeof mount> | null = null;

// Las consultas mockeadas resuelven en el acto; liveQuery entrega en un
// par de ticks. El h1 ancla el montaje: toda pantalla lo renderiza.
async function montarPantalla(componente: Component, preparar?: () => void): Promise<void> {
	preparar?.();
	instancia = mount(componente, { target: document.body });
	flushSync();
	await vi.waitFor(() => {
		expect(document.body.querySelector('h1'), 'la pantalla nunca rindio su h1').not.toBeNull();
	});
	for (let i = 0; i < 3; i += 1) {
		await new Promise((r) => setTimeout(r, 0));
	}
	flushSync();
}

describe('barrido de accesibilidad de todas las pantallas', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase({ altura_cm: 175 });
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		document.body.innerHTML = '';
	});

	for (const pantalla of PANTALLAS) {
		if (EXCLUIDOS.has(pantalla.nombre)) continue;
		const preparar = PREPARACION[pantalla.nombre];

		it(`${pantalla.nombre}: exactamente un h1`, async () => {
			const Comp = await pantalla.cargar();
			await montarPantalla(Comp, preparar);

			const h1s = document.body.querySelectorAll('h1');
			const textos = [...h1s].map((h) => h.textContent?.trim() ?? '').join(' | ');
			expect(h1s.length, `h1 encontrados: ${textos}`).toBe(1);
			CUBIERTAS.add(pantalla.nombre);
		});

		it(`${pantalla.nombre}: encabezados sin saltos de nivel`, async () => {
			const Comp = await pantalla.cargar();
			await montarPantalla(Comp, preparar);

			const encabezados = [...document.body.querySelectorAll('h1, h2, h3, h4, h5, h6')];
			let nivelPrevio = 0;
			for (const e of encabezados) {
				const nivel = Number(e.tagName.slice(1));
				expect(
					nivel,
					`salto de nivel h${nivelPrevio} a h${nivel}: "${e.textContent?.trim() ?? ''}"`,
				).toBeLessThanOrEqual(nivelPrevio + 1);
				nivelPrevio = nivel;
			}
		});

		it(`${pantalla.nombre}: todo control tiene nombre accesible`, async () => {
			const Comp = await pantalla.cargar();
			await montarPantalla(Comp, preparar);

			// Roles interactivos con regla de nombre en axe-core. Se salta
			// lo que axe considera oculto (dentro de un <details> colapsado,
			// aria-hidden, display:none): fuera del arbol no exige nombre.
			// Los nativos deshabilitados tampoco son operables.
			// getFlattenedTree puebla el cache de virtual nodes que
			// accessibleText y isVisibleToScreenReaders necesitan (sin el,
			// devuelven null y crashean). No estan en los tipos: se usa la
			// firma real del runtime.
			(axe.utils as unknown as { getFlattenedTree: (raiz: Node) => unknown[] }).getFlattenedTree(document.body);
			const visibleALector = (axe.commons.dom as unknown as { isVisibleToScreenReaders: (el: Element) => boolean })
				.isVisibleToScreenReaders;
			const controles = [...document.body.querySelectorAll(SELECTOR_INTERACTIVO)];
			for (const el of controles) {
				if (el instanceof HTMLButtonElement && el.disabled) continue;
				if (el instanceof HTMLInputElement && el.disabled) continue;
				if (el instanceof HTMLSelectElement && el.disabled) continue;
				if (el instanceof HTMLTextAreaElement && el.disabled) continue;
				if (!visibleALector(el)) continue;
				const nombre = axe.commons.text.accessibleText(el).trim();
				expect(
					nombre.length,
					`${el.tagName.toLowerCase()} sin nombre accesible: ${el.outerHTML.slice(0, 120)}`,
				).toBeGreaterThan(0);
			}
		});

		it(`${pantalla.nombre}: axe sin violaciones A/AA`, async () => {
			const Comp = await pantalla.cargar();
			await montarPantalla(Comp, preparar);

			const { violations } = await axe.run(document.body, OPCIONES_AXE);
			expect(violations, describirViolaciones(violations)).toEqual([]);
		});
	}

	it('toda pantalla descubierta está cubierta o excluida, y no hay exclusiones muertas', () => {
		const descubiertas = PANTALLAS.map((p) => p.nombre);
		const sinCubrir = descubiertas.filter((n) => !CUBIERTAS.has(n) && !EXCLUIDOS.has(n));
		expect(sinCubrir, `pantallas sin cubrir: ${sinCubrir.join(', ')}`).toEqual([]);
		const muertas = [...EXCLUIDOS].filter((e) => !descubiertas.includes(e));
		expect(muertas, `exclusiones que ya no existen: ${muertas.join(', ')}`).toEqual([]);
	});
});
