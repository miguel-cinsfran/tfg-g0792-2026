// Generar sesion (un solo generador para FULL_BODY/UPPER/LOWER).
// Plantillas en templates.json, parametros por objetivo en objetivos.json
// (via reglas.ts). Seleccion determinista via seleccion.ts.

import type {
	Ejercicio,
	EjercicioPlanificado,
	EstadoEjercicio,
	Patron,
	Perfil,
	SesionCompletada,
	TipoSesion,
} from './schema.js';
import { rules, templates, parametrosDeObjetivo } from './reglas.js';
import type { PrioridadSeries } from './reglas.js';
import { ordenarParaSeleccion } from './seleccion.js';
import { nivelNumerico } from './evaluacion.js';

export type Prioridad = PrioridadSeries;

// Item de plan con su prioridad del slot. Usado solo dentro del
// generador y de recortarAPresupuesto; no se exporta al tipo publico.
export interface ItemPlanConPrioridad {
	entry: EjercicioPlanificado;
	prioridad: Prioridad;
}

export interface GeneracionResultado {
	plan: EjercicioPlanificado[];
	// Patrones cuyo pool quedo vacio tras los filtros. La UI lo resuelve
	// con el menu de contingencia de ALG-07.
	patrones_sin_pool: Patron[];
}

// Suma un descanso por cada serie, incluida la ultima: hace que las
// sesiones reales tiendan a entrar holgadas bajo el tiempo elegido.
export function duracionEstimada(
	items: readonly ItemPlanConPrioridad[],
	trabajoSegPorSerie: number,
	calentamientoSeg: number,
): number {
	let total = calentamientoSeg;
	for (const item of items) {
		total += item.entry.series * (trabajoSegPorSerie + item.entry.descanso_segundos);
	}
	return total;
}

// Recorta el plan hasta entrar en presupuesto, o hasta el piso (solo ALTA
// en MIN_SERIES). Dos pasadas: baja series por tier; si no alcanza, quita
// ejercicios enteros baja/media (nunca ALTA). Piso: devolver as-is.
export function recortarAPresupuesto(
	itemsEntrada: readonly ItemPlanConPrioridad[],
	presupuesto_seg: number,
	trabajoSeg: number,
	calentamientoSeg: number,
	minSeries: number,
): ItemPlanConPrioridad[] {
	const items = itemsEntrada.map((i) => ({ entry: { ...i.entry }, prioridad: i.prioridad }));
	if (duracionEstimada(items, trabajoSeg, calentamientoSeg) <= presupuesto_seg) {
		return items;
	}

	const TIERS: readonly Prioridad[] = ['baja', 'media', 'alta'] as const;

	for (;;) {
		let reducida = false;
		for (const tier of TIERS) {
			for (const item of items) {
				if (item.prioridad === tier && item.entry.series > minSeries) {
					item.entry.series -= 1;
					reducida = true;
					break;
				}
			}
			if (reducida) break;
		}
		if (reducida) {
			if (duracionEstimada(items, trabajoSeg, calentamientoSeg) <= presupuesto_seg) return items;
			continue;
		}

		let quitado = false;
		for (const tier of ['baja', 'media'] as const) {
			const idx = items.findIndex((it) => it.prioridad === tier);
			if (idx >= 0) {
				items.splice(idx, 1);
				quitado = true;
				break;
			}
		}
		if (quitado) {
			if (items.length === 0) return items;
			if (duracionEstimada(items, trabajoSeg, calentamientoSeg) <= presupuesto_seg) return items;
			continue;
		}

		return items;
	}
}

// `sesionesRecientes` es el historial reciente; el filtro de novedad
// toma las ultimas RULE-SEL-HISTORIAL-SESIONES por fecha (lo recorta
// la funcion, no hace falta pre-cortarlo).
export function generarSesion(
	tipo_sesion: TipoSesion,
	perfil: Perfil,
	catalogo: Ejercicio[],
	estados: EstadoEjercicio[],
	sesionesRecientes: SesionCompletada[],
): GeneracionResultado {
	const plantilla = templates[tipo_sesion];
	const params = parametrosDeObjetivo(perfil.objetivo);

	const ventana = rules.ejercicio_seleccion['RULE-SEL-HISTORIAL-SESIONES'];
	const idsRecientes = new Set(
		[...sesionesRecientes]
			.sort((a, b) => b.fecha - a.fecha)
			.slice(0, ventana)
			.flatMap((s) => s.ejercicios.map((e) => e.ejercicio_id)),
	);

	const idsBloqueados = new Set(estados.filter((e) => e.bloqueado).map((e) => e.ejercicio_id));
	const estadoPorId = new Map(estados.map((e) => [e.ejercicio_id, e]));
	const zonasDolor = new Set(perfil.zonas_dolor_preexistente);
	const nivelUsuario = nivelNumerico(perfil.nivel_experiencia);

	// Un mismo ejercicio no se repite dentro de la sesion aunque dos
	// slots compartan pool. Defensa ante templates futuros.
	const idsElegidos = new Set<string>();

	const itemsConPrioridad: ItemPlanConPrioridad[] = [];
	const patronesSinPool: Patron[] = [];

	for (const slot of plantilla.slots) {
		// Nivel: el filtro conservador no pisa una eleccion explicita del
		// usuario. Un estado propio solo existe por haberlo ejecutado o por
		// haberlo elegido (cambio de variante en biblioteca, sugerencia de
		// progresion aceptada); sin esta excepcion, la variante confirmada
		// por encima del nivel no aparecia nunca.
		let pool = catalogo.filter(
			(e) =>
				e.patron === slot.patron &&
				(nivelNumerico(e.nivel_requerido) <= nivelUsuario || estadoPorId.has(e.id)) &&
				!idsBloqueados.has(e.id) &&
				!idsElegidos.has(e.id) &&
				e.zonas_involucradas.every((zona) => !zonasDolor.has(zona)),
		);
		if (slot.subpatron) {
			pool = pool.filter((e) => e.subpatron === slot.subpatron);
		}

		if (pool.length === 0) {
			patronesSinPool.push(slot.patron);
			continue;
		}

		let candidatos = pool;
		if (slot.novedad) {
			const frescos = pool.filter((e) => !idsRecientes.has(e.id));
			if (frescos.length > 0) candidatos = frescos;
		}
		const elegido = ordenarParaSeleccion(candidatos, estados)[0];
		idsElegidos.add(elegido.id);

		const series =
			slot.prioridad_series === 'alta'
				? params.series_por_ejercicio
				: Math.max(params.series_por_ejercicio - 1, 2);

		const estado = estadoPorId.get(elegido.id);
		const repsBase = estado ? estado.reps_objetivo : elegido.reps_iniciales;
		// Reintroduccion post-dolor: si vuelve de un bloqueo, sus N
		// primeras sesiones vuelven a volumen reducido. La reduccion se
		// aplica solo al plan de esta sesion (estado.reps_objetivo real
		// no baja). Piso 1 para que un plan con reps=1 no quede en cero.
		const restantes = estado?.reintroduccion_sesiones_restantes ?? null;
		const reintroPorcentaje = rules.dolor['RULE-DOLOR-REINTRO-PORCENTAJE'];
		const reps_objetivo =
			restantes !== null && restantes > 0
				? Math.max(1, Math.floor((repsBase * reintroPorcentaje) / 100))
				: repsBase;
		const entry: EjercicioPlanificado = {
			ejercicio_id: elegido.id,
			series,
			reps_objetivo,
			rir_objetivo: params.rir,
			descanso_segundos: params.descanso_seg,
		};
		itemsConPrioridad.push({ entry, prioridad: slot.prioridad_series });
	}

	// patrones_sin_pool se computa antes del recorte: la falta de pool
	// no se resuelve quitando ejercicios.
	const presupuesto_seg = perfil.duracion_sesion_min * 60;
	const presupuesto = rules.presupuesto;
	const recortado = recortarAPresupuesto(
		itemsConPrioridad,
		presupuesto_seg,
		presupuesto['RULE-PRESUPUESTO-TRABAJO-SEG-POR-SERIE'],
		presupuesto['RULE-PRESUPUESTO-CALENTAMIENTO-SEG'],
		presupuesto['RULE-PRESUPUESTO-MIN-SERIES'],
	);

	return { plan: recortado.map((i) => i.entry), patrones_sin_pool: patronesSinPool };
}
