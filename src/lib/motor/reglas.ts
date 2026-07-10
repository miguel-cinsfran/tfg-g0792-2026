// Importa y reexporta los JSONs de reglas con tipos verificados por el
// compilador. Si `npm run check` falla, la forma del JSON cambio y hay
// que actualizar los tipos.

import type { Patron, SubpatronCore } from './schema.js';

// rules.json
import rulesRaw from '$lib/../../static/data/rules.json' with { type: 'json' };

interface RulesShape {
	volumen: {
		'RULE-VOL-MIN-PRINC': number;
		'RULE-VOL-MIN-INT': number;
		'RULE-VOL-MIN-AVAN': number;
		'RULE-VOL-OPT-PRINC': number;
		'RULE-VOL-OPT-INT': number;
		'RULE-VOL-OPT-AVAN': number;
	};
	evaluacion_inicial: {
		'RULE-EVAL-PUSH-PRINC-MAX': number;
		'RULE-EVAL-PUSH-INT-MAX': number;
		'RULE-EVAL-PULL-PRINC-MAX': number;
		'RULE-EVAL-PULL-INT-MAX': number;
		'RULE-EVAL-LEGS-PRINC-MAX': number;
		'RULE-EVAL-LEGS-INT-MAX': number;
		'RULE-EVAL-CORE-PRINC-MAX-SEG': number;
		'RULE-EVAL-CORE-INT-MAX-SEG': number;
	};
	desbalance_inicial: {
		'RULE-DESB-PORCENTAJE': number;
		'RULE-DESB-DURACION-SEMANAS': number;
	};
	split: {
		'RULE-SPLIT-MIN-DIAS-UL': number;
		'RULE-SPLIT-MAX-DIAS-FB': number;
	};
	progresion: {
		'RULE-PROG-SESIONES-CONSEC': number;
		'RULE-PROG-INCREMENTO-REPS': number;
		'RULE-PROG-MAX-SERIES': number;
	};
	dolor: {
		'RULE-DOLOR-BLOQUEO-DIAS': number;
		'RULE-DOLOR-REINTRO-PORCENTAJE': number;
		'RULE-DOLOR-REINTRO-SESIONES': number;
	};
	ejercicio_seleccion: {
		'RULE-SEL-HISTORIAL-SESIONES': number;
	};
	presupuesto: {
		'RULE-PRESUPUESTO-TRABAJO-SEG-POR-SERIE': number;
		'RULE-PRESUPUESTO-CALENTAMIENTO-SEG': number;
		'RULE-PRESUPUESTO-MIN-SERIES': number;
	};
	haptica: {
		'RULE-HAP-INICIO-MS': number;
		'RULE-HAP-FIN-MS': number;
		'RULE-HAP-DESCANSO-AVISO-MS': number;
		'RULE-HAP-DESCANSO-FIN-MS': number;
	};
	rendimiento_ui: {
		'RNF-09-LATENCIA-MAX-MS': number;
	};
}

const rules: RulesShape = rulesRaw;
export { rules };
export type { RulesShape };

// objetivos.json
import objetivosRaw from '$lib/../../static/data/objetivos.json' with { type: 'json' };

type ObjetivoParams = Record<string, number>;

interface ObjetivosShape {
	fuerza: {
		'OBJ-FUERZA-REPS-MIN': number;
		'OBJ-FUERZA-REPS-MAX': number;
		'OBJ-FUERZA-REPS-DEFAULT': number;
		'OBJ-FUERZA-DESCANSO-SEG': number;
		'OBJ-FUERZA-RIR': number;
		'OBJ-FUERZA-EJERCICIOS-POR-SESION': number;
		'OBJ-FUERZA-SERIES-POR-EJERCICIO': number;
	};
	hipertrofia: {
		'OBJ-HIPER-REPS-MIN': number;
		'OBJ-HIPER-REPS-MAX': number;
		'OBJ-HIPER-REPS-DEFAULT': number;
		'OBJ-HIPER-DESCANSO-SEG': number;
		'OBJ-HIPER-RIR': number;
		'OBJ-HIPER-EJERCICIOS-POR-SESION': number;
		'OBJ-HIPER-SERIES-POR-EJERCICIO': number;
	};
	resistencia: {
		'OBJ-RESIS-REPS-MIN': number;
		'OBJ-RESIS-REPS-MAX': number;
		'OBJ-RESIS-REPS-DEFAULT': number;
		'OBJ-RESIS-DESCANSO-SEG': number;
		'OBJ-RESIS-RIR': number;
		'OBJ-RESIS-EJERCICIOS-POR-SESION': number;
		'OBJ-RESIS-SERIES-POR-EJERCICIO': number;
	};
	perdida_peso: {
		'OBJ-PESO-REPS-MIN': number;
		'OBJ-PESO-REPS-MAX': number;
		'OBJ-PESO-REPS-DEFAULT': number;
		'OBJ-PESO-DESCANSO-SEG': number;
		'OBJ-PESO-RIR': number;
		'OBJ-PESO-EJERCICIOS-POR-SESION': number;
		'OBJ-PESO-SERIES-POR-EJERCICIO': number;
	};
}

const objetivos: ObjetivosShape = objetivosRaw;
export { objetivos };
export type { ObjetivosShape, ObjetivoParams };

// templates.json
import templatesRaw from '$lib/../../static/data/templates.json' with { type: 'json' };

type PrioridadSeries = 'alta' | 'media' | 'baja';

interface Slot {
	id: string;
	patron: Patron;
	subpatron?: SubpatronCore;
	novedad: boolean;
	prioridad_series: PrioridadSeries;
}

interface TemplateDef {
	descripcion: string;
	slots: Slot[];
}

interface TemplatesShape {
	FULL_BODY: TemplateDef;
	UPPER: TemplateDef;
	LOWER: TemplateDef;
}

// El cast es necesario: el JSON infiere `patron` como `string`, pero
// Slot.patron es la union `Patron` (literal TS que el JSON no expresa).
const templates: TemplatesShape = templatesRaw as TemplatesShape;
export { templates };
export type { TemplatesShape, TemplateDef, Slot, PrioridadSeries };

// objetivos.json prefija cada clave con el objetivo (OBJ-FUERZA-*,
// OBJ-HIPER-*, ...); este accessor los normaliza para que el generador
// y la progresion no repitan el switch de prefijos.

import type { Objetivo } from './schema.js';

export interface ParametrosObjetivo {
	series_por_ejercicio: number;
	rir: number;
	descanso_seg: number;
	reps_default: number;
}

export function parametrosDeObjetivo(objetivo: Objetivo): ParametrosObjetivo {
	switch (objetivo) {
		case 'fuerza':
			return {
				series_por_ejercicio: objetivos.fuerza['OBJ-FUERZA-SERIES-POR-EJERCICIO'],
				rir: objetivos.fuerza['OBJ-FUERZA-RIR'],
				descanso_seg: objetivos.fuerza['OBJ-FUERZA-DESCANSO-SEG'],
				reps_default: objetivos.fuerza['OBJ-FUERZA-REPS-DEFAULT'],
			};
		case 'hipertrofia':
			return {
				series_por_ejercicio: objetivos.hipertrofia['OBJ-HIPER-SERIES-POR-EJERCICIO'],
				rir: objetivos.hipertrofia['OBJ-HIPER-RIR'],
				descanso_seg: objetivos.hipertrofia['OBJ-HIPER-DESCANSO-SEG'],
				reps_default: objetivos.hipertrofia['OBJ-HIPER-REPS-DEFAULT'],
			};
		case 'resistencia':
			return {
				series_por_ejercicio: objetivos.resistencia['OBJ-RESIS-SERIES-POR-EJERCICIO'],
				rir: objetivos.resistencia['OBJ-RESIS-RIR'],
				descanso_seg: objetivos.resistencia['OBJ-RESIS-DESCANSO-SEG'],
				reps_default: objetivos.resistencia['OBJ-RESIS-REPS-DEFAULT'],
			};
		case 'perdida_peso':
			return {
				series_por_ejercicio: objetivos.perdida_peso['OBJ-PESO-SERIES-POR-EJERCICIO'],
				rir: objetivos.perdida_peso['OBJ-PESO-RIR'],
				descanso_seg: objetivos.perdida_peso['OBJ-PESO-DESCANSO-SEG'],
				reps_default: objetivos.perdida_peso['OBJ-PESO-REPS-DEFAULT'],
			};
	}
}
