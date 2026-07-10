// Orquestador de cierre del onboarding. Ensambla Perfil via
// evaluacion + split, persiste, limpia estado. `ahora` por argumento
// para no depender de Date.now() (tests deterministas).

import type { EstadoOnboarding } from '$lib/onboarding/estado';
import { reiniciar } from '$lib/onboarding/estado';
import { evaluarNivelInicial } from '$lib/motor/evaluacion';
import type { EntradaEvaluacion, ResultadoEvaluacion } from '$lib/motor/evaluacion';
import { elegirSplit } from '$lib/motor/split';
import type { Perfil } from '$lib/motor/schema';
import { guardarPerfil } from '$lib/db/perfil';
import { crearError } from '$lib/errores/crear';

export async function finalizar(
	estado: EstadoOnboarding,
	ahora: number,
): Promise<Perfil> {
	// Validar requeridos. Sin "!": si un campo llega null, se lanza
	// aca con nombre, no fluye al motor como 0.
	if (
		estado.nombre === null ||
		estado.anio_nacimiento === null ||
		estado.peso_kg === null ||
		estado.objetivo === null ||
		estado.tiene_anclaje === null ||
		estado.dias_semana === null ||
		estado.duracion_sesion_min === null
	) {
		throw new TypeError('EstadoOnboarding incompleto: campos requeridos nulos');
	}

	const { reps_push, reps_legs, segundos_core } = estado;
	if (reps_push === null) throw new TypeError('EstadoOnboarding incompleto: reps_push');
	if (reps_legs === null) throw new TypeError('EstadoOnboarding incompleto: reps_legs');
	if (segundos_core === null) throw new TypeError('EstadoOnboarding incompleto: segundos_core');
	if (estado.tiene_anclaje && estado.reps_pull === null) {
		throw new TypeError('EstadoOnboarding incompleto: reps_pull');
	}

	const reps_pull = estado.reps_pull ?? 0;
	// Copia plana: el array puede llegar como proxy reactivo de Svelte 5
	// (bind:group en la pagina) e IndexedDB no clona proxies.
	const zonas_dolor = [...(estado.zonas_dolor_preexistente ?? [])];
	const fecha_disc = estado.fecha_aceptacion_disclaimer ?? ahora;

	const entrada: EntradaEvaluacion = {
		reps_push,
		reps_pull,
		reps_legs,
		segundos_core,
		tiene_anclaje: estado.tiene_anclaje,
	};
	const { nivel_global, evaluacion_por_patron, ajuste_desbalance_activo }: ResultadoEvaluacion =
		evaluarNivelInicial(entrada, ahora);

	const { split } = elegirSplit(estado.dias_semana, nivel_global);

	const perfil: Omit<Perfil, 'id'> = {
		nombre: estado.nombre,
		anio_nacimiento: estado.anio_nacimiento,
		peso_kg: estado.peso_kg,
		...(estado.altura_cm !== null ? { altura_cm: estado.altura_cm } : {}),
		disclaimer_aceptado: estado.disclaimer_aceptado,
		fecha_aceptacion_disclaimer: fecha_disc,
		objetivo: estado.objetivo,
		nivel_experiencia: nivel_global,
		evaluacion_por_patron,
		ajuste_desbalance_activo,
		fecha_evaluacion: ahora,
		dias_semana: estado.dias_semana,
		duracion_sesion_min: estado.duracion_sesion_min,
		split,
		zonas_dolor_preexistente: zonas_dolor,
		tiene_anclaje: estado.tiene_anclaje,
		fecha_primera_sesion: null,
	};

	try {
		await guardarPerfil(perfil);
	} catch (error) {
		throw crearError('ERR-DB-WRITE', 'Error al guardar perfil', error);
	}

	// Limpiar estado solo tras persistencia exitosa.
	reiniciar();

	return { id: 1, ...perfil };
}
