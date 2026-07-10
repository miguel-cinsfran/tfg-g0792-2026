// Store reactivo de sesion en curso. Estado privado con $state,
// transiciones puras que delegan al motor. Sin clase, sin setters
// directos. Cero logica de negocio aqui.

import { crearEstadoInicial, cancelarSesionEnCurso, cerrarSesionEnCurso } from '$lib/motor/cierre';
import { aplicarSerieCompletada, pasarSiguienteEjercicio, corregirUltimaSerie as corregirUltimaSerieMotor } from '$lib/motor/serie';
import { registrarZonasDolor, aplicarSustitucion } from '$lib/motor/dolor';
import { cerrarSesion } from '$lib/db/sesiones';
import { guardarSesionEnCurso, borrarSesionEnCurso } from '$lib/db/sesion-en-curso';
import { obtenerEstadosTodos } from '$lib/db/estado';
import type { Ejercicio, EjercicioPlanificado, EstadoEjercicio, TipoSesion, SesionEnCurso, SesionCompletada, Zona } from '$lib/motor/schema';

let estado = $state<SesionEnCurso | null>(null);

const SIN_SESION = 'No hay sesión activa';

// Respaldo tras cada transicion: fire-and-forget y best-effort (nunca
// lanza). Snapshot porque a IndexedDB no viajan proxies de Svelte 5.
function respaldar(ahora: number): void {
	if (estado === null) return;
	void guardarSesionEnCurso($state.snapshot(estado) as SesionEnCurso, ahora);
}

export function obtenerSesion(): SesionEnCurso | null {
	return estado;
}

export function comenzar(plan: EjercicioPlanificado[], tipo: TipoSesion, ahora: number): void {
	estado = crearEstadoInicial(plan, tipo, ahora);
	respaldar(ahora);
}

// Reanudacion: vuelve a memoria un respaldo leido por la pantalla de
// sesion. No re-respalda: ya esta guardado.
export function restaurar(sesion: SesionEnCurso): void {
	estado = sesion;
}

export function completarSerie(reps: number, rir: number | null, ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = aplicarSerieCompletada(estado, reps, rir, ahora);
	respaldar(ahora);
}

export function siguienteEjercicio(ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = pasarSiguienteEjercicio(estado, ahora);
	respaldar(ahora);
}

// Corrige la cantidad de la ultima serie ya registrada (caso comun: el
// usuario hizo distinto del objetivo y lo arregla desde el descanso).
// `rir_declarado` queda intacto: la correccion es de cantidad, no de esfuerzo.
export function corregirUltimaSerie(reps: number, ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = corregirUltimaSerieMotor(estado, reps, ahora);
	respaldar(ahora);
}

export function registrarDolor(zonas: Zona[], ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = registrarZonasDolor(estado, zonas);
	respaldar(ahora);
}

export function sustituir(sustituto: Ejercicio, estados: EstadoEjercicio[], ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = aplicarSustitucion(estado, sustituto, estados, ahora);
	respaldar(ahora);
}

export function cancelar(ahora: number): void {
	if (estado === null) throw new Error(SIN_SESION);
	estado = cancelarSesionEnCurso(estado, ahora);
	respaldar(ahora);
}

export function descartar(): void {
	estado = null;
	void borrarSesionEnCurso();
}

export async function cerrar(ahora: number): Promise<SesionCompletada> {
	if (estado === null) throw new Error(SIN_SESION);
	// Snapshot: el estado es un proxy reactivo profundo e IndexedDB no
	// clona proxies (DataCloneError en el put).
	const plano = $state.snapshot(estado) as SesionEnCurso;
	const estadosPrevios = await obtenerEstadosTodos();
	const resultado = cerrarSesionEnCurso(plano, estadosPrevios, ahora);
	await cerrarSesion(resultado.sesion, resultado.estados, ahora);
	estado = null;
	return resultado.sesion;
}