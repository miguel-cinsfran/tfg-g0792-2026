import type { Objetivo, Zona } from '$lib/motor/schema';

// Estado del flujo de onboarding F-01. Modulo plano sin runes ni store;
// persiste solo en memoria; al recargar, se pierde.

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

let estado: EstadoOnboarding = { ...ESTADO_INICIAL };

/** Devuelve una copia readonly del estado actual. */
export function obtener(): Readonly<EstadoOnboarding> {
	return { ...estado };
}

/** Mergea campos parciales en el estado actual. */
export function actualizar(parche: Partial<EstadoOnboarding>): void {
	estado = { ...estado, ...parche };
}

/** Resetea el estado a valores iniciales. */
export function reiniciar(): void {
	estado = { ...ESTADO_INICIAL };
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

// Salta evaluacion/pull cuando tiene_anclaje === false.
export function pasoPendiente(): string {
	const e = estado;

	if (!e.disclaimer_aceptado) return '/onboarding/disclaimer';
	if (e.nombre === null || e.anio_nacimiento === null || e.peso_kg === null)
		return '/onboarding/datos';
	if (e.objetivo === null) return '/onboarding/objetivo';
	if (e.tiene_anclaje === null) return '/onboarding/equipamiento';
	if (e.zonas_dolor_preexistente === null) return '/onboarding/dolor-preexistente';
	if (e.dias_semana === null || e.duracion_sesion_min === null)
		return '/onboarding/disponibilidad';
	if (e.reps_push === null) return '/onboarding/evaluacion/push';
	if (e.tiene_anclaje !== false && e.reps_pull === null) return '/onboarding/evaluacion/pull';
	if (e.reps_legs === null) return '/onboarding/evaluacion/legs';
	if (e.segundos_core === null) return '/onboarding/evaluacion/core';
	return '/onboarding/resumen';
}

// Orden efectivo: excluye evaluacion/pull cuando tiene_anclaje === false.
// Antes de equipamiento (tiene_anclaje null), pull esta incluido por defecto.
function ordenEfectivo(): readonly string[] {
	if (estado.tiene_anclaje === false) {
		return ORDEN_PASOS.filter((p) => p !== '/onboarding/evaluacion/pull');
	}
	return ORDEN_PASOS;
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