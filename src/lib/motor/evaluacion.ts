// Nivel global desde la evaluacion inicial. Umbrales en rules.evaluacion_inicial.

import type { AjusteDesbalance, Nivel } from './schema.js';
import { NIVELES } from './schema.js';
import { rules } from './reglas.js';

const DIA_MS = 86_400_000;

// Para comparar niveles: principiante 1, intermedio 2, avanzado 3.
// La comparte el generador para el filtro de nivel_requerido.
export function nivelNumerico(nivel: Nivel): number {
	return NIVELES.indexOf(nivel) + 1;
}

export interface EntradaEvaluacion {
	reps_push: number;
	reps_pull: number;
	reps_legs: number;
	segundos_core: number;
	// Sin anclaje no hay evaluacion de PULL: queda en principiante con 0 reps.
	tiene_anclaje: boolean;
}

export interface ResultadoEvaluacion {
	nivel_global: Nivel;
	evaluacion_por_patron: Record<'PUSH' | 'PULL' | 'LEGS' | 'CORE', Nivel>;
	// null si no hay patron debil. En MVP se guarda y se informa, pero
	// no modifica el volumen.
	ajuste_desbalance_activo: AjusteDesbalance | null;
}

function clasificar(valor: number, maxPrincipiante: number, maxIntermedio: number): Nivel {
	if (valor <= maxPrincipiante) return 'principiante';
	if (valor <= maxIntermedio) return 'intermedio';
	return 'avanzado';
}

// `ahora` fija fecha_inicio y fecha_revision del ajuste de desbalance.
export function evaluarNivelInicial(entrada: EntradaEvaluacion, ahora: number): ResultadoEvaluacion {
	const ev = rules.evaluacion_inicial;

	const porPatron: ResultadoEvaluacion['evaluacion_por_patron'] = {
		PUSH: clasificar(entrada.reps_push, ev['RULE-EVAL-PUSH-PRINC-MAX'], ev['RULE-EVAL-PUSH-INT-MAX']),
		PULL: entrada.tiene_anclaje
			? clasificar(entrada.reps_pull, ev['RULE-EVAL-PULL-PRINC-MAX'], ev['RULE-EVAL-PULL-INT-MAX'])
			: 'principiante',
		LEGS: clasificar(entrada.reps_legs, ev['RULE-EVAL-LEGS-PRINC-MAX'], ev['RULE-EVAL-LEGS-INT-MAX']),
		CORE: clasificar(
			entrada.segundos_core,
			ev['RULE-EVAL-CORE-PRINC-MAX-SEG'],
			ev['RULE-EVAL-CORE-INT-MAX-SEG'],
		),
	};

	// nivel_global = moda de los cuatro; empate gana el mas conservador.
	// NIVELES ya esta en orden conservador -> ">" estricto deja al primero.
	const niveles = Object.values(porPatron);
	let nivelGlobal: Nivel = 'principiante';
	let mejorConteo = -1;
	for (const nivel of NIVELES) {
		const conteo = niveles.filter((n) => n === nivel).length;
		if (conteo > mejorConteo) {
			nivelGlobal = nivel;
			mejorConteo = conteo;
		}
	}

	// Patron mas debil: mayor diferencia con el global. Empate por la
	// prioridad PULL > PUSH > LEGS > CORE (orden de este recorrido).
	const globalNum = nivelNumerico(nivelGlobal);
	const prioridad = ['PULL', 'PUSH', 'LEGS', 'CORE'] as const;
	let masDebil: (typeof prioridad)[number] | null = null;
	let mayorDiferencia = 0;
	for (const patron of prioridad) {
		const diferencia = globalNum - nivelNumerico(porPatron[patron]);
		if (diferencia > mayorDiferencia) {
			mayorDiferencia = diferencia;
			masDebil = patron;
		}
	}

	const desb = rules.desbalance_inicial;
	const ajuste: AjusteDesbalance | null =
		masDebil === null
			? null
			: {
					patron: masDebil,
					porcentaje: desb['RULE-DESB-PORCENTAJE'],
					fecha_inicio: ahora,
					fecha_revision: ahora + desb['RULE-DESB-DURACION-SEMANAS'] * 7 * DIA_MS,
				};

	return {
		nivel_global: nivelGlobal,
		evaluacion_por_patron: porPatron,
		ajuste_desbalance_activo: ajuste,
	};
}
