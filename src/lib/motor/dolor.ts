// Reportar dolor (parte pura: sustituto, zonas, sustitucion) y bloqueos
// vencidos. El bloqueo y el historial_dolor viven en lib/db; aca solo
// los calculos puros. Consumidores: F-04 (modal de dolor), arranque.

import type {
	Ejercicio,
	EjercicioPlanificado,
	EstadoEjercicio,
	Nivel,
	SesionEnCurso,
	Zona,
} from './schema.js';
import { ordenarParaSeleccion } from './seleccion.js';
import { nivelNumerico } from './evaluacion.js';
import { crearEjecutado } from './serie.js';
import { rules } from './reglas.js';

// Primero el mapa `sustituciones` del propio ejercicio (curado, se respeta
// si el candidato no esta bloqueado o colgado). Despues, el catalogo
// filtrado: mismo patron, nivel alcanzable, distinto del actual, no
// bloqueado y sin tocar las zonas reportadas; gana el de uso menos reciente.
// `plan` es opcional para no forzar a los llamadores existentes: quien lo
// pase evita que el sustituto sea un ejercicio que ya ocupa otro slot,
// en las dos ramas (el generador ya evita esa repeticion al armar el plan).
// null = pool agotado: la UI ofrece el menu ALG-07.
export function buscarSustituto(
	ejercicio: Ejercicio,
	zonas: Zona[],
	catalogo: Ejercicio[],
	estados: EstadoEjercicio[],
	nivel_usuario: Nivel,
	plan: readonly EjercicioPlanificado[] = [],
): Ejercicio | null {
	const bloqueados = new Set(estados.filter((e) => e.bloqueado).map((e) => e.ejercicio_id));
	const enPlan = new Set(plan.map((p) => p.ejercicio_id));

	for (const zona of zonas) {
		const candidatoId = ejercicio.sustituciones[zona];
		if (candidatoId === undefined || bloqueados.has(candidatoId) || enPlan.has(candidatoId))
			continue;
		const candidato = catalogo.find((e) => e.id === candidatoId);
		if (candidato) return candidato;
	}

	const zonasReportadas = new Set(zonas);
	const candidatos = catalogo.filter(
		(e) =>
			e.patron === ejercicio.patron &&
			nivelNumerico(e.nivel_requerido) <= nivelNumerico(nivel_usuario) &&
			e.id !== ejercicio.id &&
			!bloqueados.has(e.id) &&
			!enPlan.has(e.id) &&
			e.zonas_involucradas.every((z) => !zonasReportadas.has(z)),
	);
	if (candidatos.length === 0) return null;
	return ordenarParaSeleccion(candidatos, estados)[0];
}

// Deja constancia de las zonas reportadas en el EjercicioEjecutado del
// ejercicio actual (creandolo si el dolor llego antes de la primera
// serie). Se invoca ANTES de sustituir o de cancelar.
export function registrarZonasDolor(sesion: SesionEnCurso, zonas: Zona[]): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('registrarZonasDolor: no hay ejercicio en curso');
	}
	const id = sesion.plan[sesion.indice_ejercicio].ejercicio_id;
	const ejecutados = [...sesion.ejecutados];
	let i = ejecutados.findIndex((e) => e.ejercicio_id === id);
	if (i === -1) {
		ejecutados.push(crearEjecutado(sesion));
		i = ejecutados.length - 1;
	}
	const actual = ejecutados[i];
	const nuevas = zonas.filter((z) => !actual.zonas_dolor_reportadas.includes(z));
	ejecutados[i] = {
		...actual,
		zonas_dolor_reportadas: [...actual.zonas_dolor_reportadas, ...nuevas],
	};
	return { ...sesion, ejecutados };
}

// Corrige el reporte que se esta haciendo (segunda confirmacion tras
// "Revisar mis zonas"): quita las zonas que este reporte ya habia
// marcado y ya no confirma, y agrega las nuevas. Las zonas de reportes
// anteriores (las que no estan en `zonasPreviasDelReporte`) no se tocan.
// No reemplaza registrarZonasDolor: esa acumula porque cada reporte
// cuenta, esta corrige el mismo reporte.
export function corregirZonasDolor(
	sesion: SesionEnCurso,
	zonasPreviasDelReporte: Zona[],
	zonasConfirmadas: Zona[],
): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('corregirZonasDolor: no hay ejercicio en curso');
	}
	const id = sesion.plan[sesion.indice_ejercicio].ejercicio_id;
	const ejecutados = [...sesion.ejecutados];
	let i = ejecutados.findIndex((e) => e.ejercicio_id === id);
	if (i === -1) {
		ejecutados.push(crearEjecutado(sesion));
		i = ejecutados.length - 1;
	}
	const actual = ejecutados[i];
	const previas = new Set(zonasPreviasDelReporte);
	const confirmadas = new Set(zonasConfirmadas);
	const corregidas = actual.zonas_dolor_reportadas.filter(
		(z) => !previas.has(z) || confirmadas.has(z),
	);
	for (const z of zonasConfirmadas) {
		if (!previas.has(z) && !corregidas.includes(z)) corregidas.push(z);
	}
	ejecutados[i] = { ...actual, zonas_dolor_reportadas: corregidas };
	return { ...sesion, ejecutados };
}

// Reemplaza el ejercicio actual del plan por el sustituto: series, rir
// y descanso se heredan del slot reemplazado; las reps salen del estado
// del sustituto o de sus reps_iniciales. La cuenta de series arranca de 0.
export function aplicarSustitucion(
	sesion: SesionEnCurso,
	sustituto: Ejercicio,
	estados: EstadoEjercicio[],
	_ahora: number,
): SesionEnCurso {
	if (sesion.indice_ejercicio >= sesion.plan.length) {
		throw new Error('aplicarSustitucion: no hay ejercicio en curso');
	}
	const slot = sesion.plan[sesion.indice_ejercicio];
	const estado = estados.find((e) => e.ejercicio_id === sustituto.id);
	const plan = [...sesion.plan];
	plan[sesion.indice_ejercicio] = {
		ejercicio_id: sustituto.id,
		series: slot.series,
		reps_objetivo: estado ? estado.reps_objetivo : sustituto.reps_iniciales,
		rir_objetivo: slot.rir_objetivo,
		descanso_segundos: slot.descanso_segundos,
	};
	return { ...sesion, plan, indice_serie: 0 };
}

// Bloqueos cuya fecha_revision ya vencio, para que la UI pregunte al
// usuario al inicio de la sesion. La resolucion es escritura de lib/db.
export function bloqueosVencidos(estados: EstadoEjercicio[], ahora: number): EstadoEjercicio[] {
	return estados.filter(
		(e) => e.bloqueado && e.fecha_revision !== null && ahora >= e.fecha_revision,
	);
}

// Desbloquea el ejercicio y arranca la reintroduccion gradual. El flag
// `bloqueado` y los campos de bloqueo los limpia la db en la misma
// transaccion; aca solo se ocupa del campo de reintroduccion y limpia
// la bandera para que `generarSesion` lo elija del pool.
export function reactivarEjercicio(estado: EstadoEjercicio): EstadoEjercicio {
	return {
		...estado,
		bloqueado: false,
		razon_bloqueo: null,
		fecha_bloqueo: null,
		fecha_revision: null,
		reintroduccion_sesiones_restantes: rules.dolor['RULE-DOLOR-REINTRO-SESIONES'],
	};
}
