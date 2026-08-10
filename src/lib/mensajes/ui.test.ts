import { describe, it, expect } from 'vitest';
import { M, formatearTiempo } from './ui';

describe('M.progreso - línea del historial', () => {
	// La unica entrada del historial con logica real: compone nombre,
	// series y valores unidos; no nombra la unidad (no siempre son
	// repeticiones, hay segundos).
	it('lineaHistorial: "Flexiones: 3 de 3 series. Cada serie: 8, 8, 7"', () => {
		expect(M.progreso.lineaHistorial('Flexiones', 3, 3, '8, 8, 7')).toBe(
			'Flexiones: 3 de 3 series. Cada serie: 8, 8, 7',
		);
	});
});

describe('M.sesion.objetivo - camino isometrico', () => {
	// Para isometrico el margen RIR no aplica: se muestra solo
	// "Sostén X segundos" sin la parte del margen.
	it('isometrico: omite el margen y dice "Sostén 30 segundos"', () => {
		const resultado = M.sesion.objetivo(30, 'segundos', 2);
		expect(resultado).toBe('Sostén 30 segundos.');
		expect(resultado).not.toContain('más');
	});

	it('isometrico: formatea como tiempo si supera 60s', () => {
		const resultado = M.sesion.objetivo(90, 'segundos', 2);
		expect(resultado).toBe('Sostén 1 minuto 30 segundos.');
	});
});

describe('M.perfil.resumen - plurales del resumen', () => {
	it('diasSemana: "1 día" en singular', () => {
		expect(M.perfil.resumen.diasSemana(1)).toBe('Entrenas 1 día por semana.');
	});

	it('diasSemana: "5 días" en plural', () => {
		expect(M.perfil.resumen.diasSemana(5)).toBe('Entrenas 5 días por semana.');
	});

	it('duracionSesion: "Sesión de 1 minuto" para un minuto', () => {
		expect(M.perfil.resumen.duracionSesion(formatearTiempo(60))).toBe('Sesión de 1 minuto.');
	});

	it('duracionSesion: "Sesiones de 20 minutos" para veinte minutos', () => {
		expect(M.perfil.resumen.duracionSesion(formatearTiempo(1200))).toBe('Sesiones de 20 minutos.');
	});
});

describe('M.modal - cierres del dialogo', () => {
	it('cerrar y volver son strings no vacios y distintos', () => {
		expect(M.modal.cerrar).toBe('Cerrar');
		expect(M.modal.volver).toBe('Volver');
		expect(M.modal.cerrar.length).toBeGreaterThan(0);
		expect(M.modal.volver.length).toBeGreaterThan(0);
		expect(M.modal.cerrar).not.toBe(M.modal.volver);
	});
});

describe('M.sesion.errorPlanVacio - plan vacio', () => {
	it('texto exacto del contrato', () => {
		expect(M.sesion.errorPlanVacio).toBe(
			'No hay ejercicios seguros para tus zonas con dolor actuales. Revisa tus zonas para desbloquear ejercicios.',
		);
	});
});
