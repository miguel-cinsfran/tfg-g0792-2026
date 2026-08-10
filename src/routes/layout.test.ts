// @vitest-environment jsdom
//
// Tests del contrato accesible de la barra inferior de pestanas en
// +layout.svelte. El HTML y el orden de la lista los
// cubre el lector al barrer; lo que se fija aca es el NOMBRE ACCESIBLE y
// la PALABRA DE ROL, que son los unicos canales que TalkBack honra en
// WebView (justificacion en ui/flujos.md, "Estructura de navegacion").

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import type { ComponentProps } from 'svelte';

// `vi.hoisted` se evalua ANTES de los `vi.mock` (que se hoistean al
// top del archivo). Asi el estado del mock vive en una unica variable
// que el test puede mutar entre casos.
const estadoMock = vi.hoisted(() => ({
	pathname: '/',
	gotoMock: vi.fn(),
	onNavigateMock: vi.fn(),
	sonarMock: vi.fn(),
	precargarMock: vi.fn(),
	musicaFondoMock: vi.fn(),
	musicaSesionMock: vi.fn(),
	pausarMusicaMock: vi.fn(),
	reanudarMusicaMock: vi.fn(),
	esPlataformaNativa: false,
	registerSWMock: vi.fn(),
	statusBarMock: vi.fn()
}));

vi.mock('$app/state', () => ({
	// `page` no se importa como named: el layout hace
	// `import { page } from '$app/state'`. El proxy reactivo de SvelteKit
	// expone `url.pathname`; usamos getters para que mutar
	// `estadoMock.pathname` antes del mount tome efecto en el siguiente
	// render (los mocks de vi.mock se hoistean y un valor literal quedaria
	// congelado al momento de la primera importacion).
	page: {
		get url() {
			return {
				get pathname() {
					return estadoMock.pathname;
				}
			};
		}
	}
}));

// En `$app/state` real `page` es un $state, asi que mutar `pathname`
// desde el test dispara la reactividad. El mock de arriba no es $state
// porque Svelte 5 lo trata como objeto literal: el layout hace
// `$derived(page.url.pathname)` y lee la propiedad en cada ejecucion
// del efecto, asi que la mutacion antes del mount basta. Re-montamos
// en cada test para que la derivacion tome el valor nuevo.

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
	onNavigate: (...args: unknown[]) => estadoMock.onNavigateMock(...args),
	// RouteAnnouncer (montado dentro del layout) usa afterNavigate para
	// anunciar el titulo de la pagina; sin este export el mock revienta
	// el componente.
	afterNavigate: (fn: (nav: unknown) => void) => fn
}));

// Los modulos de sonido se llaman en onMount; en tests no se monta el
// WebView ni se carga el .mp3, asi que silenciamos todo.
vi.mock('$lib/sonido/reproducir', () => ({
	sonar: (...args: unknown[]) => estadoMock.sonarMock(...args),
	precargar: (...args: unknown[]) => estadoMock.precargarMock(...args)
}));

vi.mock('$lib/sonido/musica', () => ({
	reproducirFondo: (...args: unknown[]) => estadoMock.musicaFondoMock(...args),
	reproducirSesion: (...args: unknown[]) => estadoMock.musicaSesionMock(...args),
	pausar: (...args: unknown[]) => estadoMock.pausarMusicaMock(...args),
	reanudar: (...args: unknown[]) => estadoMock.reanudarMusicaMock(...args)
}));

// Capacitor.isNativePlatform() = false evita que onMount monte el
// listener de backButton (depende del plugin nativo, no testeable en
// jsdom sin mas mocks). El bloque `if (Capacitor.isNativePlatform())`
// del layout ya esta pensado para ese cortocircuito.
vi.mock('@capacitor/core', () => ({
	Capacitor: { isNativePlatform: () => estadoMock.esPlataformaNativa }
}));

// El layout importa ambos plugins con import() dinamico DENTRO del
// bloque nativo: sin estos mocks, el modulo real intentaria el bridge
// nativo de la WebView y fallaria en jsdom.
vi.mock('@capacitor/status-bar', () => ({
	StatusBar: { setBackgroundColor: (...args: unknown[]) => estadoMock.statusBarMock(...args) }
}));

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: () => Promise.resolve({ remove: () => Promise.resolve() }),
		minimizeApp: () => Promise.resolve()
	}
}));

// virtual:pwa-register lo importa el layout dentro de onMount con
// import() dinamico; sin el mock el build del modulo virtual falla en
// el entorno de Vitest.
vi.mock('virtual:pwa-register', () => ({
	registerSW: (...args: unknown[]) => estadoMock.registerSWMock(...args)
}));

import Layout from './+layout.svelte';

// Perfil valido cualquiera: el $effect del layout redirige a /onboarding
// solo cuando no hay perfil; con perfil presente ninguna ruta redirige
// (los deep links llegan a su destino). El shape minimo es lo unico que
// el layout mira (testea `data?.perfil`); el contenido real se valida
// en bootstrap.test.ts.
const perfilMinimo = {
	id: 1 as const,
	nombre: 'Test',
	anio_nacimiento: 1990,
	peso_kg: 70,
	disclaimer_aceptado: true,
	fecha_aceptacion_disclaimer: 1000000,
	objetivo: 'fuerza' as const,
	nivel_experiencia: 'principiante' as const,
	evaluacion_por_patron: {
		PUSH: 'principiante' as const,
		PULL: 'principiante' as const,
		LEGS: 'principiante' as const,
		CORE: 'principiante' as const
	},
	ajuste_desbalance_activo: null,
	fecha_evaluacion: 1000000,
	dias_semana: 3,
	duracion_sesion_min: 30,
	split: 'FULL_BODY' as const,
	zonas_dolor_preexistente: [],
	tiene_anclaje: false,
	fecha_primera_sesion: null
};

function montar(
	pathname: '/' | '/biblioteca' | '/progreso' | '/perfil',
	perfil: typeof perfilMinimo | null = perfilMinimo
) {
	// Mutar pathname antes del mount: el layout hace
	// `currentPath = $derived(page.url.pathname)` y el objeto `page` se
	// evalua en el momento del mount. Re-montamos en cada test (no
	// cambiamos el pathname sobre la misma instancia) para que la
	// derivacion tome el valor actualizado.
	(estadoMock as { pathname: string }).pathname = pathname;

	// children es un Snippet obligatorio en el layout (renderea el slot).
	// Pasamos un noop: solo nos interesa la barra de pestanas.
	const children = (() => {}) as unknown as ComponentProps<typeof Layout>['children'];

	const instancia = mount(Layout, {
		target: document.body,
		props: {
			data: { perfil },
			children
		}
	});
	flushSync();
	return instancia;
}

describe('Barra de pestanas (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.sonarMock.mockReset();
		estadoMock.statusBarMock.mockReset();
		estadoMock.esPlataformaNativa = false;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
	});

	it('los cuatro botones llevan aria-roledescription="pestaña" (reemplaza "boton")', () => {
		instancia = montar('/');
		const botones = document.body.querySelectorAll('nav[aria-label="Navegación principal"] button');
		expect(botones.length).toBe(4);
		botones.forEach((b) => {
			expect(b.getAttribute('aria-roledescription')).toBe('pestaña');
		});
	});

	it('en la ruta activa el aria-label lleva " seleccionada"; las demas no', () => {
		instancia = montar('/');
		const botones = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		);
		const activos = botones.filter((b) => b.getAttribute('aria-label')?.endsWith(' seleccionada'));
		const inactivos = botones.filter((b) => !b.getAttribute('aria-label')?.endsWith(' seleccionada'));
		expect(activos.length).toBe(1);
		expect(inactivos.length).toBe(3);
		// El activo corresponde a Inicio (pathname '/')
		expect(activos[0].getAttribute('aria-label')).toBe('Inicio seleccionada');
		// Los inactivos no llevan " seleccionada"
		inactivos.forEach((b) => {
			const al = b.getAttribute('aria-label') ?? '';
			expect(al.endsWith(' seleccionada')).toBe(false);
		});
	});

	it('cambiar la ruta activa cambia cual boton lleva " seleccionada"', () => {
		// '/biblioteca' -> "Ejercicios seleccionada" (la ruta interna sigue
		// siendo /biblioteca; solo cambia la etiqueta visible del tab, no
		// el href. El aria-label usa la etiqueta visible).
		instancia = montar('/biblioteca');
		const activos = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		).filter((b) => b.getAttribute('aria-label')?.endsWith(' seleccionada'));
		expect(activos.length).toBe(1);
		expect(activos[0].getAttribute('aria-label')).toBe('Ejercicios seleccionada');
	});

	it('en /perfil la cuarta pestaña lleva "Perfil seleccionada"', () => {
		instancia = montar('/perfil');
		const activos = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		).filter((b) => b.getAttribute('aria-label')?.endsWith(' seleccionada'));
		expect(activos.length).toBe(1);
		expect(activos[0].getAttribute('aria-label')).toBe('Perfil seleccionada');
	});

	it('con perfil en /perfil no redirige (los deep links llegan a su destino)', () => {
		instancia = montar('/perfil');
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});

	it('sin perfil redirige a /onboarding con replaceState', () => {
		instancia = montar('/perfil', null);
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/onboarding', { replaceState: true });
	});

	it('el aria-label nunca lleva la palabra "pestaña" (para no duplicarse con el roledescription)', () => {
		instancia = montar('/');
		const botones = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		);
		botones.forEach((b) => {
			const al = b.getAttribute('aria-label') ?? '';
			expect(al.toLowerCase()).not.toContain('pestaña');
		});
	});

	it('el nav contenedor conserva aria-label="Navegación principal"', () => {
		instancia = montar('/');
		const nav = document.body.querySelector('nav');
		expect(nav?.getAttribute('aria-label')).toBe('Navegación principal');
	});

	it('la region global #live-assertive conserva role="alert" y aria-live="assertive"', () => {
		instancia = montar('/');
		const region = document.body.querySelector('#live-assertive');
		expect(region?.getAttribute('role')).toBe('alert');
		expect(region?.getAttribute('aria-live')).toBe('assertive');
	});
});

describe('Tinte de la barra de estado (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.statusBarMock.mockReset();
		estadoMock.esPlataformaNativa = false;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
	});

	it('en plataforma nativa tine la barra con el color de superficie', async () => {
		estadoMock.esPlataformaNativa = true;
		instancia = montar('/');
		// onMount es async: el import dinamico del plugin resuelve en un
		// tick posterior al flushSync, por eso se espera el mock.
		await vi.waitFor(() => {
			expect(estadoMock.statusBarMock).toHaveBeenCalledWith({ color: '#0f1413' });
		});
	});

	it('en web no tine la barra de estado', async () => {
		estadoMock.esPlataformaNativa = false;
		instancia = montar('/');
		await flushSync();
		expect(estadoMock.statusBarMock).not.toHaveBeenCalled();
	});
});

describe('Guardia de view transitions (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	const matchMediaOriginal = window.matchMedia;

	// La guardia JS de onNavigate no se toca en este cambio: estas tres
	// rutas la fijan para que las reglas CSS nuevas no la contradigan.
	function ultimoCallbackOnNavigate(): (nav: unknown) => unknown {
		const llamadas = estadoMock.onNavigateMock.mock.calls;
		return llamadas[llamadas.length - 1]?.[0] as (nav: unknown) => unknown;
	}

	function conMatchMedia(matches: boolean) {
		window.matchMedia = ((consulta: string) =>
			({
				matches: matches ? consulta.includes('prefers-reduced-motion') : false,
				media: consulta,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false
			}) as MediaQueryList) as typeof window.matchMedia;
	}

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		window.matchMedia = matchMediaOriginal;
		delete (document as { startViewTransition?: unknown }).startViewTransition;
	});

	it('sin soporte de view transitions omite la transicion', () => {
		instancia = montar('/');
		// jsdom no implementa startViewTransition: la guardia corta.
		expect(ultimoCallbackOnNavigate()({})).toBeUndefined();
	});

	it('con prefers-reduced-motion omite la transicion aunque haya soporte', () => {
		instancia = montar('/');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(true);
		expect(ultimoCallbackOnNavigate()({ complete: Promise.resolve() })).toBeUndefined();
		expect(stub).not.toHaveBeenCalled();
	});

	it('con soporte y movimiento permitido llama a startViewTransition', () => {
		instancia = montar('/');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(false);
		const resultado = ultimoCallbackOnNavigate()({ complete: Promise.resolve() });
		expect(resultado).toBeInstanceOf(Promise);
		expect(stub).toHaveBeenCalledOnce();
	});
});
