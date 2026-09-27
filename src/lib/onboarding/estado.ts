import { browser } from '$app/environment';
import type { Objetivo, Zona } from '$lib/motor/schema';
import { grupoVaciadoPorDolor, PATRONES_POR_GRUPO } from '$lib/motor/evaluacion';
import type { GrupoEvaluable } from '$lib/motor/evaluacion';
import { obtenerCatalogo } from '$lib/catalogo/estado';

// Estado del flujo de onboarding F-01. Modulo plano sin runes ni store.
// El alta tiene diez pasos y el sistema puede matar la WebView en
// segundo plano; por eso el estado se persiste en localStorage tras
// cada cambio y se lee al inicializar. Lectura sincrona: las guardas de
// ruta deciden con el estado en el primer tick.

export type EstadoOnboarding = {
	disclaimer_aceptado: boolean;
	fecha_aceptacion_disclaimer: number | null;
	nombre: string | null;
	anio_nacimiento: number | null;
	peso_kg: number | null;
	altura_cm: number | null;
	objetivo: Objetivo | null;
	tiene_anclaje: boolean | null;
	zonas_dolor_preexistente: Zona[] | null;
	dias_semana: number | null;
	duracion_sesion_min: number | null;
	reps_push: number | null;
	reps_pull: number | null;
	reps_legs: number | null;
	segundos_core: number | null;
};

const CLAVE_PERSISTENCIA = 'onboarding-estado';

const ESTADO_INICIAL: EstadoOnboarding = {
	disclaimer_aceptado: false,
	fecha_aceptacion_disclaimer: null,
	nombre: null,
	anio_nacimiento: null,
	peso_kg: null,
	altura_cm: null,
	objetivo: null,
	tiene_anclaje: null,
	zonas_dolor_preexistente: null,
	dias_semana: null,
	duracion_sesion_min: null,
	reps_push: null,
	reps_pull: null,
	reps_legs: null,
	segundos_core: null
};

// Un alta a medias corrupta no puede dejar la app inservible: si lo
// persistido no tiene la forma esperada, se descarta.
function esEstadoValido(v: unknown): v is EstadoOnboarding {
	if (typeof v !== 'object' || v === null) return false;
	const e = v as Record<string, unknown>;
	return (
		typeof e.disclaimer_aceptado === 'boolean' &&
		(e.fecha_aceptacion_disclaimer === null || typeof e.fecha_aceptacion_disclaimer === 'number') &&
		(e.nombre === null || typeof e.nombre === 'string') &&
		(e.anio_nacimiento === null || typeof e.anio_nacimiento === 'number') &&
		(e.peso_kg === null || typeof e.peso_kg === 'number') &&
		(e.altura_cm === null || typeof e.altura_cm === 'number') &&
		(e.objetivo === null || typeof e.objetivo === 'string') &&
		(e.tiene_anclaje === null || typeof e.tiene_anclaje === 'boolean') &&
		(e.zonas_dolor_preexistente === null || Array.isArray(e.zonas_dolor_preexistente)) &&
		(e.dias_semana === null || typeof e.dias_semana === 'number') &&
		(e.duracion_sesion_min === null || typeof e.duracion_sesion_min === 'number') &&
		(e.reps_push === null || typeof e.reps_push === 'number') &&
		(e.reps_pull === null || typeof e.reps_pull === 'number') &&
		(e.reps_legs === null || typeof e.reps_legs === 'number') &&
		(e.segundos_core === null || typeof e.segundos_core === 'number')
	);
}

function leerPersistido(): EstadoOnboarding {
	if (!browser) return { ...ESTADO_INICIAL };
	try {
		const crudo = localStorage.getItem(CLAVE_PERSISTENCIA);
		if (crudo === null) return { ...ESTADO_INICIAL };
		const parseado: unknown = JSON.parse(crudo);
		if (!esEstadoValido(parseado)) return { ...ESTADO_INICIAL };
		return parseado;
	} catch {
		return { ...ESTADO_INICIAL };
	}
}

let estado: EstadoOnboarding = leerPersistido();

/** Devuelve una copia readonly del estado actual. */
export function obtener(): Readonly<EstadoOnboarding> {
	return { ...estado };
}

/** Mergea campos parciales en el estado actual. */
export function actualizar(parche: Partial<EstadoOnboarding>): void {
	estado = { ...estado, ...parche };
	persistir();
}

/** Resetea el estado a valores iniciales. */
export function reiniciar(): void {
	estado = { ...ESTADO_INICIAL };
	limpiarPersistido();
}

function persistir(): void {
	if (!browser) return;
	try {
		localStorage.setItem(CLAVE_PERSISTENCIA, JSON.stringify(estado));
	} catch {
		// sin storage el alta sigue viva en memoria
	}
}

function limpiarPersistido(): void {
	if (!browser) return;
	try {
		localStorage.removeItem(CLAVE_PERSISTENCIA);
	} catch {
		// sin storage no hay nada que limpiar
	}
}

// Orden de completitud de los pasos. Usa solo esta fuente.
const ORDEN_PASOS = [
	'/onboarding/disclaimer',
	'/onboarding/datos',
	'/onboarding/objetivo',
	'/onboarding/equipamiento',
	'/onboarding/dolor-preexistente',
	'/onboarding/disponibilidad',
	'/onboarding/evaluacion/push',
	'/onboarding/evaluacion/pull',
	'/onboarding/evaluacion/legs',
	'/onboarding/evaluacion/core',
	'/onboarding/resumen'
] as const;

// Grupos cuya prueba el dolor declarado deja sin sentido: vacia el
// pool de todos sus patrones. Sin catalogo cargado no se omite nada.
export function gruposOmitidosPorDolor(): GrupoEvaluable[] {
	const zonas = estado.zonas_dolor_preexistente;
	const catalogo = obtenerCatalogo();
	if (zonas === null || catalogo.length === 0) return [];
	return (Object.keys(PATRONES_POR_GRUPO) as GrupoEvaluable[]).filter((g) =>
		grupoVaciadoPorDolor(g, zonas, catalogo),
	);
}

const RUTA_POR_GRUPO = {
	PUSH: '/onboarding/evaluacion/push',
	PULL: '/onboarding/evaluacion/pull',
	LEGS: '/onboarding/evaluacion/legs',
	CORE: '/onboarding/evaluacion/core',
} as const;

// Salta evaluacion/pull cuando tiene_anclaje === false.
export function pasoPendiente(): string {
	const e = estado;
	const omitidos = gruposOmitidosPorDolor();

	if (!e.disclaimer_aceptado) return '/onboarding/disclaimer';
	if (e.nombre === null || e.anio_nacimiento === null || e.peso_kg === null)
		return '/onboarding/datos';
	if (e.objetivo === null) return '/onboarding/objetivo';
	if (e.tiene_anclaje === null) return '/onboarding/equipamiento';
	if (e.zonas_dolor_preexistente === null) return '/onboarding/dolor-preexistente';
	if (e.dias_semana === null || e.duracion_sesion_min === null)
		return '/onboarding/disponibilidad';
	if (e.reps_push === null && !omitidos.includes('PUSH')) return '/onboarding/evaluacion/push';
	if (e.tiene_anclaje !== false && e.reps_pull === null && !omitidos.includes('PULL'))
		return '/onboarding/evaluacion/pull';
	if (e.reps_legs === null && !omitidos.includes('LEGS')) return '/onboarding/evaluacion/legs';
	if (e.segundos_core === null && !omitidos.includes('CORE')) return '/onboarding/evaluacion/core';
	return '/onboarding/resumen';
}

// Orden efectivo: excluye evaluacion/pull cuando tiene_anclaje === false.
// Antes de equipamiento (tiene_anclaje null), pull esta incluido por defecto.
function ordenEfectivo(): readonly string[] {
	let orden = [...ORDEN_PASOS];
	if (estado.tiene_anclaje === false) {
		orden = orden.filter((p) => p !== '/onboarding/evaluacion/pull');
	}
	for (const grupo of gruposOmitidosPorDolor()) {
		orden = orden.filter((p) => p !== RUTA_POR_GRUPO[grupo]);
	}
	return orden;
}

// Paso anterior real segun el orden efectivo: null si la ruta es la
// primera o ajena al flujo. Las paginas del alta lo usan en su Atras.
export function pasoAnterior(ruta: string): string | null {
	const efectivo = ordenEfectivo();
	const idx = efectivo.indexOf(ruta);
	if (idx <= 0) return null;
	return efectivo[idx - 1];
}

// Orden visible del progreso: el efectivo SIN la bienvenida.
function ordenProgreso(): readonly string[] {
	return ordenEfectivo().filter((p) => p !== '/onboarding/disclaimer');
}

// Devuelve null si la ruta es ajena al progreso. El total baja en 1
// cuando tiene_anclaje === false (pull omitido).
export function progresoOnboarding(
	ruta: string
): { paso: number; total: number } | null {
	if (ruta === '/onboarding' || ruta === '/onboarding/disclaimer') return null;
	const progreso = ordenProgreso();
	const idx = progreso.indexOf(ruta);
	if (idx === -1) return null;
	return { paso: idx + 1, total: progreso.length };
}

// Indica si una ruta es accesible segun el progreso actual.
export function puedeVisitar(ruta: string): boolean {
	const efectivo = ordenEfectivo();
	const idxRuta = efectivo.indexOf(ruta);
	if (idxRuta === -1) return false;
	const pendiente = pasoPendiente();
	const idxPendiente = efectivo.indexOf(pendiente);
	if (idxPendiente === -1) return false;
	return idxRuta <= idxPendiente;
}