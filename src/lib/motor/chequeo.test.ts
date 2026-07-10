import { describe, it, expect } from 'vitest';
import { esSesionDeChequeo } from './chequeo';
import type { SesionCompletada } from './schema';

function sesion(fecha: number, cancelada = false): SesionCompletada {
	return {
		id: `sesion-${fecha}`,
		fecha,
		tipo: 'FULL_BODY',
		ejercicios: [],
		duracion_minutos: 30,
		cancelada_por_dolor: cancelada,
	};
}

// Semana de referencia: lunes 8 jun 2026 a domingo 14 jun 2026 (local).
const LUNES = new Date(2026, 5, 8, 8, 0).getTime();
const MIERCOLES = new Date(2026, 5, 10, 8, 0).getTime();
const VIERNES = new Date(2026, 5, 12, 8, 0).getTime();
const DOMINGO_ANTERIOR = new Date(2026, 5, 7, 8, 0).getTime();

describe('esSesionDeChequeo', () => {
	it('sin sesiones previas: no es chequeo (no hay nada que ajustar)', () => {
		expect(esSesionDeChequeo([], MIERCOLES)).toBe(false);
	});

	it('con una sesion previa en la misma semana: no es de chequeo', () => {
		expect(esSesionDeChequeo([sesion(LUNES)], VIERNES)).toBe(false);
	});

	it('con sesiones solo de semanas anteriores: es de chequeo (primera sesion real de la semana)', () => {
		expect(esSesionDeChequeo([sesion(DOMINGO_ANTERIOR)], LUNES)).toBe(true);
	});

	it('una cancelada por dolor esta semana (sin reales): no es chequeo', () => {
		expect(esSesionDeChequeo([sesion(LUNES, true)], MIERCOLES)).toBe(false);
	});

	it('cancelada y completada esta semana: la completada manda, no es de chequeo', () => {
		expect(esSesionDeChequeo([sesion(LUNES, true), sesion(MIERCOLES)], VIERNES)).toBe(false);
	});

	it('todas las sesiones previas canceladas por dolor: no es chequeo (canceladas no cuentan)', () => {
		expect(esSesionDeChequeo([sesion(LUNES, true), sesion(MIERCOLES, true)], VIERNES)).toBe(false);
	});
});
