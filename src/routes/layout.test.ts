// @vitest-environment jsdom
//
// Tests del contrato accesible de la barra inferior de pestanas en
// +layout.svelte. El HTML y el orden de la lista los
// cubre el lector al barrer; lo que se fija aca es el NOMBRE ACCESIBLE y
// la PALABRA DE ROL, que son los unicos canales que TalkBack honra en
// WebView.

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
	statusBarMock: vi.fn(),
	statusBarStyleMock: vi.fn(),
	listenerAtras: null as null | ((ev: { canGoBack: boolean }) => void)
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
	reproducirSesion: (...args: unknown[]) =>
		estadoMock.musicaSesionMock(...args),
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
	StatusBar: {
		setBackgroundColor: (...args: unknown[]) =>
			estadoMock.statusBarMock(...args),
		setStyle: (...args: unknown[]) => estadoMock.statusBarStyleMock(...args)
	},
	Style: { Light: 'LIGHT', Dark: 'DARK' }
}));

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: (evento: string, fn: (ev: { canGoBack: boolean }) => void) => {
			if (evento === 'backButton') estadoMock.listenerAtras = fn;
			return Promise.resolve({ remove: () => Promise.resolve() });
		},
		minimizeApp: () => Promise.resolve()
	}
}));

// virtual:pwa-register lo importa el layout dentro de onMount con
// import() dinamico; sin el mock el build del modulo virtual falla en
// el entorno de Vitest.
vi.mock('virtual:pwa-register', () => ({
	registerSW: (...args: unknown[]) => estadoMock.registerSWMock(...args)
}));

// jsdom no trae ResizeObserver (el layout mide la barra con
// bind:clientHeight); stub inerte, mismo que en sesion/page.test.ts.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver =
	ResizeObserverStub as unknown as typeof ResizeObserver;

import Layout from './+layout.svelte';
import { guardarAspecto } from '$lib/aspecto/aspecto';
import {
	marcarProximaComoVolver,
	consumirMarcaVolver
} from '$lib/navegacion/transicion';
import {
	registrarVolver,
	reiniciarVolver
} from '$lib/navegacion/atras-pantalla';

// Perfil valido cualquiera: el $effect del layout redirige a /onboarding
// cuando no hay perfil; con perfil conserva la URL (los deep links llegan
// a su destino) salvo en las rutas de /onboarding, que con perfil ya no
// tienen alta que terminar y se devuelven al inicio. El shape minimo es
// lo unico que el layout mira (testea `data?.perfil`); el contenido real
// se valida en bootstrap.test.ts.
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
	pathname:
		| '/'
		| '/biblioteca'
		| `/biblioteca/${string}`
		| '/progreso'
		| '/perfil'
		| '/config'
		| `/config/${string}`
		| `/onboarding/${string}`,
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
	const children = (() => {}) as unknown as ComponentProps<
		typeof Layout
	>['children'];

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
		estadoMock.statusBarStyleMock.mockReset();
		estadoMock.esPlataformaNativa = false;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
	});

	it('los cuatro botones llevan aria-roledescription="pestaña" (reemplaza "boton")', () => {
		instancia = montar('/');
		const botones = document.body.querySelectorAll(
			'nav[aria-label="Navegación principal"] button'
		);
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
		const activos = botones.filter((b) =>
			b.getAttribute('aria-label')?.endsWith(' seleccionada')
		);
		const inactivos = botones.filter(
			(b) => !b.getAttribute('aria-label')?.endsWith(' seleccionada')
		);
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
		expect(activos[0].getAttribute('aria-label')).toBe(
			'Ejercicios seleccionada'
		);
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

	it('en /biblioteca/<id> Ejercicios lleva " seleccionada" e Inicio no', () => {
		instancia = montar('/biblioteca/ej-001');
		const botones = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		);
		const porEtiqueta = (prefijo: string) =>
			botones.find((b) =>
				(b.getAttribute('aria-label') ?? '').startsWith(prefijo)
			);
		expect(porEtiqueta('Ejercicios')?.getAttribute('aria-label')).toBe(
			'Ejercicios seleccionada'
		);
		expect(porEtiqueta('Inicio')?.getAttribute('aria-label')).toBe('Inicio');
	});

	it('en /biblioteca/<id> tocar Ejercicios navega a /biblioteca con sonido', () => {
		instancia = montar('/biblioteca/ej-001');
		estadoMock.gotoMock.mockClear();
		estadoMock.sonarMock.mockClear();
		const boton = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		).find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Ejercicios')
		);
		expect(boton).toBeDefined();
		boton?.click();
		flushSync();
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/biblioteca');
		expect(estadoMock.sonarMock).toHaveBeenCalledWith('cambio-pestania');
	});

	it('en /biblioteca exacto tocar Ejercicios no navega ni suena', () => {
		instancia = montar('/biblioteca');
		estadoMock.gotoMock.mockClear();
		estadoMock.sonarMock.mockClear();
		const boton = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		).find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Ejercicios')
		);
		expect(boton).toBeDefined();
		boton?.click();
		flushSync();
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
		expect(estadoMock.sonarMock).not.toHaveBeenCalled();
	});

	it('con perfil en /perfil no redirige (los deep links llegan a su destino)', () => {
		instancia = montar('/perfil');
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
	});

	it('sin perfil redirige a /onboarding con replaceState', () => {
		instancia = montar('/perfil', null);
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/onboarding', {
			replaceState: true
		});
	});

	it('con perfil en una ruta de onboarding redirige a / con replaceState', () => {
		instancia = montar('/onboarding/objetivo');
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/', {
			replaceState: true
		});
	});

	it('con perfil en una ruta normal no redirige', () => {
		// Afirma sobre gotoMock a propósito: lo que la persona percibe ES
		// el cambio de pantalla, y en este entorno la navegación no ocurre
		// de verdad. Este caso impide que la guarda pase por accidente con
		// una condición que redirija siempre.
		instancia = montar('/biblioteca');
		expect(estadoMock.gotoMock).not.toHaveBeenCalled();
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

	it('sin barra de pestanas hay franja inferior aria-hidden; con barra no', () => {
		instancia = montar('/config');
		const franja = document.body.querySelector(
			'div.fixed.bottom-0[aria-hidden="true"]'
		);
		expect(franja).not.toBeNull();
		expect(franja?.getAttribute('style')).toContain('franja-abajo');
		unmount(instancia);
		document.body.innerHTML = '';
		instancia = montar('/');
		expect(
			document.body.querySelector('div.fixed.bottom-0[aria-hidden="true"]')
		).toBeNull();
	});
});

describe('Icono relleno de la pestaña activa (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	// Inicios distintivos de los dibujos Phosphor: "bold" (contorno) y
	// "fill" (macizo). La pestaña activa se dibuja maciza.
	const CASA_BOLD = 'M222.14,105.85';
	const CASA_FILL = 'M224,120v96a8,8,0,0,1-8,8H160';
	const HALTERA_BOLD = 'M244,116V88a20,20,0,0,0-20-20H208';
	const HALTERA_FILL = 'M200,64V192a16,16,0,0,1-16,16H168';
	const BARRAS = 'M224,200h-8V40';
	const BARRAS_FILL = 'M232,208a8,8,0,0,1-8,8H32';

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.gotoMock.mockReset();
		estadoMock.sonarMock.mockReset();
		estadoMock.statusBarMock.mockReset();
		estadoMock.statusBarStyleMock.mockReset();
		estadoMock.esPlataformaNativa = false;
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
	});

	function iconoDe(prefijoEtiqueta: string): string {
		const boton = Array.from(
			document.body.querySelectorAll<HTMLButtonElement>(
				'nav[aria-label="Navegación principal"] button'
			)
		).find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith(prefijoEtiqueta)
		);
		return boton?.querySelector('svg')?.innerHTML ?? '';
	}

	it('en /biblioteca el icono de Ejercicios es el relleno y el de Inicio no', () => {
		instancia = montar('/biblioteca');
		expect(iconoDe('Ejercicios')).toContain(HALTERA_FILL);
		expect(iconoDe('Ejercicios')).not.toContain(HALTERA_BOLD);
		expect(iconoDe('Inicio')).toContain(CASA_BOLD);
		expect(iconoDe('Inicio')).not.toContain(CASA_FILL);
	});

	it('en / el icono de Inicio es el relleno y el de Ejercicios no', () => {
		instancia = montar('/');
		expect(iconoDe('Inicio')).toContain(CASA_FILL);
		expect(iconoDe('Inicio')).not.toContain(CASA_BOLD);
		expect(iconoDe('Ejercicios')).toContain(HALTERA_BOLD);
		expect(iconoDe('Ejercicios')).not.toContain(HALTERA_FILL);
	});

	it('en /progreso el icono de Progreso es el relleno (barras) y en / no', () => {
		instancia = montar('/progreso');
		expect(iconoDe('Progreso')).toContain(BARRAS_FILL);
		expect(iconoDe('Progreso')).not.toContain(BARRAS);
		unmount(instancia);
		document.body.innerHTML = '';
		instancia = montar('/');
		expect(iconoDe('Progreso')).toContain(BARRAS);
		expect(iconoDe('Progreso')).not.toContain(BARRAS_FILL);
	});
});

describe('Tinte de la barra de estado (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.statusBarMock.mockReset();
		estadoMock.statusBarStyleMock.mockReset();
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
			expect(estadoMock.statusBarMock).toHaveBeenCalledWith({
				color: '#F7F4EE'
			});
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
		expect(
			ultimoCallbackOnNavigate()({ complete: Promise.resolve() })
		).toBeUndefined();
		expect(stub).not.toHaveBeenCalled();
	});

	it('con soporte y movimiento permitido llama a startViewTransition', () => {
		instancia = montar('/');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(false);
		const resultado = ultimoCallbackOnNavigate()({
			complete: Promise.resolve()
		});
		expect(resultado).toBeInstanceOf(Promise);
		expect(stub).toHaveBeenCalledOnce();
	});

	function navegacionEntre(origen: string, destino: string, tipo = 'goto') {
		return {
			from: { url: { pathname: origen } },
			to: { url: { pathname: destino } },
			type: tipo,
			complete: Promise.resolve()
		};
	}

	it('entre pestanas no inicia transicion ni marca sentido', () => {
		instancia = montar('/');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(false);
		document.documentElement.removeAttribute('data-sentido-transicion');
		const resultado = ultimoCallbackOnNavigate()(
			navegacionEntre('/', '/biblioteca')
		);
		expect(resultado).toBeUndefined();
		expect(stub).not.toHaveBeenCalled();
		expect(
			document.documentElement.hasAttribute('data-sentido-transicion')
		).toBe(false);
	});

	it('hacia una subruta marca adelante en <html> e inicia la transicion', () => {
		instancia = montar('/perfil');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(false);
		consumirMarcaVolver();
		ultimoCallbackOnNavigate()(navegacionEntre('/perfil', '/config'));
		expect(document.documentElement.dataset.sentidoTransicion).toBe('adelante');
		expect(stub).toHaveBeenCalledOnce();
	});

	it('con la marca de volver desliza atras', () => {
		instancia = montar('/config');
		const stub = vi.fn();
		(document as { startViewTransition?: unknown }).startViewTransition = stub;
		conMatchMedia(false);
		marcarProximaComoVolver();
		ultimoCallbackOnNavigate()(navegacionEntre('/config', '/perfil'));
		expect(document.documentElement.dataset.sentidoTransicion).toBe('atras');
		expect(stub).toHaveBeenCalledOnce();
	});
});

describe('Escucha del sistema (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	const matchMediaOriginal = window.matchMedia;

	type OyenteCambio = (evento: { matches: boolean }) => void;

	let sistemaEnOscuro = false;
	let oyentes: OyenteCambio[] = [];

	// matchMedia controlable: matches sigue a sistemaEnOscuro y el
	// change se dispara a mano llamando a cambiarSistema.
	function instalarMatchMedia(): void {
		oyentes = [];
		window.matchMedia = ((consulta: string) =>
			({
				matches: consulta.includes('prefers-color-scheme')
					? sistemaEnOscuro
					: false,
				media: consulta,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: (_tipo: string, fn: OyenteCambio) => {
					oyentes.push(fn);
				},
				removeEventListener: (_tipo: string, fn: OyenteCambio) => {
					oyentes = oyentes.filter((o) => o !== fn);
				},
				dispatchEvent: () => false
			}) as unknown as MediaQueryList) as typeof window.matchMedia;
	}

	function cambiarSistema(aOscuro: boolean): void {
		sistemaEnOscuro = aOscuro;
		for (const fn of [...oyentes]) fn({ matches: aOscuro });
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		document.documentElement.removeAttribute('data-tema');
		localStorage.clear();
		sistemaEnOscuro = false;
		instalarMatchMedia();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		window.matchMedia = matchMediaOriginal;
	});

	it('con preferencia en sistema, el cambio del telefono a oscuro re-aplica el tema', async () => {
		guardarAspecto('sistema');
		instancia = montar('/');
		await vi.waitFor(() => {
			expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
		});

		cambiarSistema(true);

		await vi.waitFor(() => {
			expect(document.documentElement.getAttribute('data-tema')).toBe('oscuro');
		});
	});

	it('con preferencia en claro, el cambio del telefono no toca el tema', async () => {
		guardarAspecto('claro');
		instancia = montar('/');
		await vi.waitFor(() => {
			expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
		});

		cambiarSistema(true);
		await new Promise((r) => setTimeout(r, 20));

		expect(document.documentElement.getAttribute('data-tema')).toBe('claro');
	});
});

describe('Service worker solo en web (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;

	const desregistrarMock = vi.fn();
	const borrarCacheMock = vi.fn();

	function instalarMocksNativos() {
		Object.defineProperty(navigator, 'serviceWorker', {
			value: {
				getRegistrations: () =>
					Promise.resolve([{ unregister: desregistrarMock }])
			},
			configurable: true
		});
		Object.defineProperty(globalThis, 'caches', {
			value: {
				keys: () => Promise.resolve(['workbox-precache']),
				delete: borrarCacheMock
			},
			configurable: true
		});
	}

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.registerSWMock.mockReset();
		desregistrarMock.mockReset();
		borrarCacheMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		estadoMock.esPlataformaNativa = false;
		// @ts-expect-error solo en tests: se vuelve al jsdom sin SW ni caches
		delete navigator.serviceWorker;
		// @ts-expect-error solo en tests: se vuelve al jsdom sin SW ni caches
		delete globalThis.caches;
	});

	it('en nativo no registra el SW y desregistra los existentes', async () => {
		estadoMock.esPlataformaNativa = true;
		instalarMocksNativos();
		instancia = montar('/');
		await vi.waitFor(() => {
			expect(desregistrarMock).toHaveBeenCalledOnce();
		});
		expect(estadoMock.registerSWMock).not.toHaveBeenCalled();
	});

	it('en nativo borra las caches de workbox que hayan quedado', async () => {
		estadoMock.esPlataformaNativa = true;
		instalarMocksNativos();
		instancia = montar('/');
		await vi.waitFor(() => {
			expect(borrarCacheMock).toHaveBeenCalledWith('workbox-precache');
		});
	});

	it('en web registra el SW una vez', async () => {
		estadoMock.esPlataformaNativa = false;
		instancia = montar('/');
		await vi.waitFor(() => {
			expect(estadoMock.registerSWMock).toHaveBeenCalledOnce();
		});
	});
});

// Fuera de las pestañas, este listener ejecuta el Atrás de la pantalla,
// no retrocede por historial: si no, Configuración > Aspecto > Atrás de
// pantalla > atrás del sistema vuelve a Aspecto y el usuario queda en un
// bucle.
describe('Atrás del teléfono (+layout.svelte)', () => {
	let instancia: ReturnType<typeof mount> | null = null;
	let back: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.esPlataformaNativa = true;
		estadoMock.listenerAtras = null;
		estadoMock.gotoMock.mockReset();
		reiniciarVolver();
		back = vi.spyOn(history, 'back').mockImplementation(() => {});
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		estadoMock.esPlataformaNativa = false;
		reiniciarVolver();
		back.mockRestore();
	});

	async function listener() {
		await vi.waitFor(() =>
			expect(estadoMock.listenerAtras).toBeTypeOf('function')
		);
		return estadoMock.listenerAtras as (ev: { canGoBack: boolean }) => void;
	}

	it('sin pestañas ejecuta el Atrás de la pantalla y no el historial', async () => {
		instancia = montar('/config/aspecto');
		const volver = vi.fn();
		registrarVolver(volver);
		(await listener())({ canGoBack: true });
		expect(volver).toHaveBeenCalledOnce();
		expect(back).not.toHaveBeenCalled();
	});

	it('sin pestañas y sin Atrás registrado retrocede por historial', async () => {
		instancia = montar('/config');
		(await listener())({ canGoBack: true });
		expect(back).toHaveBeenCalledOnce();
	});

	it('en una pestaña va a Inicio aunque haya un Atrás registrado', async () => {
		instancia = montar('/perfil');
		const volver = vi.fn();
		registrarVolver(volver);
		(await listener())({ canGoBack: true });
		expect(volver).not.toHaveBeenCalled();
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/');
	});
});
