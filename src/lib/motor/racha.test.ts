import { describe, it, expect } from 'vitest';
import { calcularRacha, calcularMejorRacha } from './racha';
import { sesionBase } from '../../../tests/fixtures/sesion-base';

// AHORA del proyecto es miercoles 10 jun 2026 12:00 local. Para que los
// limites de semana (lunes a domingo, hora local) queden explicitos,
// aqui las fechas se construyen directamente con el constructor local.
const AHORA = new Date(2026, 5, 10, 12).getTime(); // miercoles 10 jun

function sesionEl(anio: number, mesIndice: number, dia: number, hora = 10) {
	return sesionBase({
		id: `sesion-${anio}-${mesIndice}-${dia}-${hora}`,
		fecha: new Date(anio, mesIndice, dia, hora).getTime(),
	});
}

describe('calcularRacha (ALG-11)', () => {
	it('sin sesiones la racha es 0', () => {
		expect(calcularRacha([], 3, AHORA)).toBe(0);
	});

	it('la semana actual cumplida vale 1', () => {
		// Semana actual: lunes 8 jun a domingo 14 jun.
		const sesiones = [sesionEl(2026, 5, 8), sesionEl(2026, 5, 9), sesionEl(2026, 5, 10, 9)];
		expect(calcularRacha(sesiones, 3, AHORA)).toBe(1);
	});

	it('la semana actual incompleta no suma pero tampoco corta la racha', () => {
		// Dos semanas previas cumplidas (3 sesiones cada una), actual con 1.
		const sesiones = [
			// Semana del 25 al 31 de mayo.
			sesionEl(2026, 4, 25),
			sesionEl(2026, 4, 27),
			sesionEl(2026, 4, 29),
			// Semana del 1 al 7 de junio.
			sesionEl(2026, 5, 1),
			sesionEl(2026, 5, 3),
			sesionEl(2026, 5, 5),
			// Semana actual: solo una sesion todavia.
			sesionEl(2026, 5, 9),
		];
		expect(calcularRacha(sesiones, 3, AHORA)).toBe(2);
	});

	it('la semana actual cumplida se suma a las previas consecutivas', () => {
		const sesiones = [
			sesionEl(2026, 5, 1),
			sesionEl(2026, 5, 3),
			sesionEl(2026, 5, 5),
			sesionEl(2026, 5, 8),
			sesionEl(2026, 5, 9),
			sesionEl(2026, 5, 10, 9),
		];
		expect(calcularRacha(sesiones, 3, AHORA)).toBe(2);
	});

	it('una semana incumplida en el medio corta la racha', () => {
		const sesiones = [
			// Semana del 25 al 31 de mayo: cumplida pero queda detras del hueco.
			sesionEl(2026, 4, 25),
			sesionEl(2026, 4, 27),
			sesionEl(2026, 4, 29),
			// Semana del 1 al 7 de junio: solo 1 sesion (incumplida).
			sesionEl(2026, 5, 3),
			// Semana actual cumplida.
			sesionEl(2026, 5, 8),
			sesionEl(2026, 5, 9),
			sesionEl(2026, 5, 10, 9),
		];
		expect(calcularRacha(sesiones, 3, AHORA)).toBe(1);
	});

	it('las sesiones canceladas por dolor no cumplen', () => {
		const sesiones = [
			sesionEl(2026, 5, 8),
			sesionEl(2026, 5, 9),
			sesionBase({
				id: 'cancelada',
				fecha: new Date(2026, 5, 10, 9).getTime(),
				cancelada_por_dolor: true,
			}),
		];
		expect(calcularRacha(sesiones, 3, AHORA)).toBe(0);
	});

	it('la semana va de lunes a domingo en hora local', () => {
		// Domingo 7 jun pertenece a la semana anterior; lunes 8 jun a la
		// actual. Con dias_semana 1: ambas semanas cumplen.
		const sesiones = [sesionEl(2026, 5, 7), sesionEl(2026, 5, 8)];
		expect(calcularRacha(sesiones, 1, AHORA)).toBe(2);
	});

	it('dias_semana invalido lanza', () => {
		expect(() => calcularRacha([], 0, AHORA)).toThrow();
	});

	// El conteo es por DIAS DISTINTOS, no por sesiones. El perfil
	// declara `dias_semana` (cuantos dias por semana entrena el usuario)
	// y dos turnos el mismo dia no deben contar doble.
	it('dos sesiones el mismo dia con meta 2 NO cumple la semana', () => {
		// Semana actual: lunes 8 jun a domingo 14 jun. AHORA es miercoles 10.
		const sesiones = [
			sesionEl(2026, 5, 9, 9), // martes manana
			sesionEl(2026, 5, 9, 18), // martes tarde (mismo dia)
		];
		expect(calcularRacha(sesiones, 2, AHORA)).toBe(0);
	});

	it('dos sesiones en dos dias distintos con meta 2 SI cumple la semana', () => {
		const sesiones = [
			sesionEl(2026, 5, 9), // martes
			sesionEl(2026, 5, 10, 9), // miercoles
		];
		expect(calcularRacha(sesiones, 2, AHORA)).toBe(1);
	});
});

describe('calcularMejorRacha (ALG-11, mejor historica)', () => {
	it('sin sesiones es 0', () => {
		expect(calcularMejorRacha([], 3, AHORA)).toBe(0);
	});

	it('dias_semana invalido lanza', () => {
		expect(() => calcularMejorRacha([], 0, AHORA)).toThrow('al menos 1');
	});

	it('una corrida vieja cortada vale aunque la racha actual sea 0', () => {
		// Dos semanas cumplidas en mayo, hueco, y la actual incompleta.
		const sesiones = [
			// Semana del 11 al 17 de mayo.
			sesionEl(2026, 4, 11),
			sesionEl(2026, 4, 13),
			// Semana del 18 al 24 de mayo.
			sesionEl(2026, 4, 18),
			sesionEl(2026, 4, 20),
			// Semana actual: una sola sesion.
			sesionEl(2026, 5, 9),
		];
		expect(calcularRacha(sesiones, 2, AHORA)).toBe(0);
		expect(calcularMejorRacha(sesiones, 2, AHORA)).toBe(2);
	});

	it('elige la corrida mas larga entre varias', () => {
		const sesiones = [
			// Corrida de 1: semana del 20 al 26 de abril.
			sesionEl(2026, 3, 20),
			// Hueco. Corrida de 2: semanas del 11 y del 18 de mayo.
			sesionEl(2026, 4, 11),
			sesionEl(2026, 4, 18),
			// Hueco (semana del 25 de mayo vacia). Semana del 1 de junio.
			sesionEl(2026, 5, 1),
		];
		expect(calcularMejorRacha(sesiones, 1, AHORA)).toBe(2);
	});

	it('nunca es menor que la racha actual', () => {
		const sesiones = [sesionEl(2026, 5, 1), sesionEl(2026, 5, 8)];
		const actual = calcularRacha(sesiones, 1, AHORA);
		expect(calcularMejorRacha(sesiones, 1, AHORA)).toBeGreaterThanOrEqual(actual);
		expect(calcularMejorRacha(sesiones, 1, AHORA)).toBe(2);
	});

	it('las canceladas por dolor no cumplen', () => {
		const sesiones = [
			sesionEl(2026, 4, 11),
			sesionBase({ id: 'cancelada', fecha: new Date(2026, 4, 18, 10).getTime(), cancelada_por_dolor: true }),
		];
		expect(calcularMejorRacha(sesiones, 1, AHORA)).toBe(1);
	});

	// Con meta 1, dos sesiones el mismo dia sigue valiendo (la semana
	// cumple con un solo dia), pero con meta 2 NO cumple.
	it('con meta 1, dos sesiones el mismo dia si cumple', () => {
		const sesiones = [sesionEl(2026, 5, 9, 9), sesionEl(2026, 5, 9, 18)];
		expect(calcularMejorRacha(sesiones, 1, AHORA)).toBe(1);
	});

	it('con meta 2, dos sesiones el mismo dia NO cumple', () => {
		const sesiones = [sesionEl(2026, 5, 9, 9), sesionEl(2026, 5, 9, 18)];
		expect(calcularMejorRacha(sesiones, 2, AHORA)).toBe(0);
	});
});
