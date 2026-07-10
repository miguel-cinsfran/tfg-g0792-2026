import { describe, it, expect } from 'vitest';
import { contarProgresoSemana } from './progreso-semanal';
import { sesionBase } from '../../../tests/fixtures/sesion-base';

// AHORA del proyecto: miercoles 10 jun 2026 12:00 local. Para que los
// limites de semana (lunes a domingo, hora local) queden explicitos, las
// fechas se construyen con el constructor local. Mismo criterio que
// racha.test.ts: si la regla del motor cambia, este test queda anclado
// al mismo `ahora`.
const AHORA = new Date(2026, 5, 10, 12).getTime();

function sesionEl(anio: number, mesIndice: number, dia: number, hora = 10, id?: string) {
	return sesionBase({
		id: id ?? `sesion-${anio}-${mesIndice}-${dia}-${hora}`,
		fecha: new Date(anio, mesIndice, dia, hora).getTime(),
	});
}

describe('contarProgresoSemana', () => {
	it('sin sesiones devuelve 0 de N', () => {
		expect(contarProgresoSemana([], 3, AHORA)).toEqual({ hechas: 0, meta: 3 });
	});

	it('cuenta solo sesiones de la semana en curso (lunes a domingo local)', () => {
		// Semana actual: lunes 8 jun a domingo 14 jun. AHORA es miercoles 10.
		const sesiones = [
			sesionEl(2026, 5, 8), // lunes
			sesionEl(2026, 5, 9), // martes
			sesionEl(2026, 5, 10, 9), // miercoles
		];
		expect(contarProgresoSemana(sesiones, 3, AHORA)).toEqual({ hechas: 3, meta: 3 });
	});

	it('ignora sesiones de semanas anteriores', () => {
		const sesiones = [
			sesionEl(2026, 5, 1), // semana del 1 al 7 de junio
			sesionEl(2026, 5, 3), // semana del 1 al 7 de junio
			sesionEl(2026, 5, 5), // semana del 1 al 7 de junio
			sesionEl(2026, 5, 8), // lunes de la semana actual
			sesionEl(2026, 5, 10, 9), // miercoles
		];
		expect(contarProgresoSemana(sesiones, 3, AHORA)).toEqual({ hechas: 2, meta: 3 });
	});

	it('ignora sesiones canceladas por dolor', () => {
		const sesiones = [
			sesionEl(2026, 5, 8),
			sesionEl(2026, 5, 9),
			sesionBase({
				id: 'cancelada-mie',
				fecha: new Date(2026, 5, 10, 9).getTime(),
				cancelada_por_dolor: true,
			}),
		];
		expect(contarProgresoSemana(sesiones, 3, AHORA)).toEqual({ hechas: 2, meta: 3 });
	});

	it('la frontera de semana cae en lunes 00:00 local', () => {
		// Domingo 14 jun 23:59 pertenece a la semana actual; lunes 15 jun
		// 00:00 ya es la siguiente semana.
		const sesiones = [
			sesionEl(2026, 5, 14, 23), // domingo, semana actual
			sesionEl(2026, 5, 15, 0), // lunes, semana nueva
		];
		expect(contarProgresoSemana(sesiones, 5, AHORA)).toEqual({ hechas: 1, meta: 5 });
	});

	it('cuenta dias distintos: dos turnos el mismo dia es un dia', () => {
		// dias_semana = 3; el usuario entreno 3 dias distintos, con un
		// turno extra el mismo miercoles. Cuentan los dias, no los
		// turnos: el compromiso semanal es por dias de entrenamiento.
		const sesiones = [
			sesionEl(2026, 5, 8), // lunes
			sesionEl(2026, 5, 9), // martes
			sesionEl(2026, 5, 10, 9), // miercoles
			sesionEl(2026, 5, 10, 18), // mismo miercoles, dos turnos: un solo dia
		];
		expect(contarProgresoSemana(sesiones, 3, AHORA)).toEqual({ hechas: 3, meta: 3 });
	});

	it('puede superar la meta (mas dias que la meta en la misma semana)', () => {
		// dias_semana = 3 pero el usuario entreno 4 dias distintos esta
		// semana: el conteo refleja lo hecho, no se recorta a la meta.
		const sesiones = [
			sesionEl(2026, 5, 8),
			sesionEl(2026, 5, 9),
			sesionEl(2026, 5, 10, 9),
			sesionEl(2026, 5, 11), // jueves, dia distinto
		];
		expect(contarProgresoSemana(sesiones, 3, AHORA)).toEqual({ hechas: 4, meta: 3 });
	});

	it('devuelve la meta del perfil (dias_semana) tal cual', () => {
		expect(contarProgresoSemana([], 2, AHORA).meta).toBe(2);
		expect(contarProgresoSemana([], 5, AHORA).meta).toBe(5);
	});
});
