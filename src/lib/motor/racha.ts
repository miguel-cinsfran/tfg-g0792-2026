// Racha semanal. Semana calendario LOCAL de lunes a domingo; una semana
// cumple si tiene al menos `dias_semana` dias DISTINTOS de calendario
// local con sesion (dos sesiones el mismo dia cuentan como un dia).
// Sesiones canceladas por dolor NO cumplen.

import type { SesionCompletada } from './schema.js';

// Medianoche local del lunes de la semana a la que pertenece `ts`.
// Constructor local de Date para que los limites respeten el calendario
// local. Tambien la usa el chequeo semanal.
export function inicioSemana(ts: number): number {
	const fecha = new Date(ts);
	const diasDesdeLunes = (fecha.getDay() + 6) % 7; // getDay(): 0 = domingo
	return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - diasDesdeLunes).getTime();
}

// Medianoche local del dia de `ts`. Mismo constructor local: respeta DST
// y cambios de zona horaria sin aritmetica de ms.
function claveDia(ts: number): number {
	const fecha = new Date(ts);
	return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

function sesionesPorSemanaDe(sesiones: SesionCompletada[]): Map<number, number> {
	const diasPorSemana = new Map<number, Set<number>>();
	for (const sesion of sesiones) {
		if (sesion.cancelada_por_dolor) continue;
		const semana = inicioSemana(sesion.fecha);
		let dias = diasPorSemana.get(semana);
		if (!dias) {
			dias = new Set();
			diasPorSemana.set(semana, dias);
		}
		dias.add(claveDia(sesion.fecha));
	}
	const porSemana = new Map<number, number>();
	for (const [semana, dias] of diasPorSemana) {
		porSemana.set(semana, dias.size);
	}
	return porSemana;
}

export function calcularRacha(
	sesiones: SesionCompletada[],
	dias_semana: number,
	ahora: number,
): number {
	if (dias_semana < 1) {
		throw new Error('calcularRacha: dias_semana debe ser al menos 1');
	}

	const sesionesPorSemana = sesionesPorSemanaDe(sesiones);
	const cumple = (semana: number) => (sesionesPorSemana.get(semana) ?? 0) >= dias_semana;

	const semanaActual = inicioSemana(ahora);
	let racha = cumple(semanaActual) ? 1 : 0;

	// Hacia atras hasta la primera semana incumplida.
	let cursor = new Date(semanaActual);
	for (;;) {
		cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
		if (!cumple(cursor.getTime())) break;
		racha++;
	}
	return racha;
}

// Mejor racha historica: la corrida mas larga de semanas consecutivas
// cumplidas. Misma semantica que calcularRacha, asi nunca es menor.
export function calcularMejorRacha(
	sesiones: SesionCompletada[],
	dias_semana: number,
	ahora: number,
): number {
	if (dias_semana < 1) {
		throw new Error('calcularMejorRacha: dias_semana debe ser al menos 1');
	}

	const sesionesPorSemana = sesionesPorSemanaDe(sesiones);
	if (sesionesPorSemana.size === 0) return 0;

	const semanaActual = inicioSemana(ahora);
	const primeraSemana = Math.min(...sesionesPorSemana.keys());
	let mejor = 0;
	let corrida = 0;
	let cursor = new Date(primeraSemana);
	while (cursor.getTime() <= semanaActual) {
		if ((sesionesPorSemana.get(cursor.getTime()) ?? 0) >= dias_semana) {
			corrida++;
			if (corrida > mejor) mejor = corrida;
		} else {
			corrida = 0;
		}
		cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
	}
	return mejor;
}
