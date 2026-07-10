import { describe, it, expect } from 'vitest';
import { decidirAccionAtras } from './atras-telefono';

describe('decidirAccionAtras', () => {
	describe('ruta Inicio (/)', () => {
		it('primer toque (desarmado) -> armar doble atras', () => {
			expect(decidirAccionAtras('/', 'desarmado', true, true)).toEqual({
				tipo: 'armar-doble-atras',
			});
		});

		it('segundo toque dentro del plazo (armado) -> minimizar', () => {
			expect(decidirAccionAtras('/', 'armado', true, true)).toEqual({
				tipo: 'minimizar',
			});
		});
	});

	describe('otras pestañas (Ejercicios, Racha, Perfil)', () => {
		it('/biblioteca -> ir a Inicio (sin importar estado)', () => {
			expect(decidirAccionAtras('/biblioteca', 'desarmado', true, false)).toEqual({
				tipo: 'ir-a-inicio',
			});
			expect(decidirAccionAtras('/biblioteca', 'armado', true, false)).toEqual({
				tipo: 'ir-a-inicio',
			});
		});

		it('/progreso -> ir a Inicio', () => {
			expect(decidirAccionAtras('/progreso', 'desarmado', true, false)).toEqual({
				tipo: 'ir-a-inicio',
			});
		});

		it('/config -> ir a Inicio', () => {
			expect(decidirAccionAtras('/config', 'desarmado', true, false)).toEqual({
				tipo: 'ir-a-inicio',
			});
		});
	});

	describe('flujos lineales (no son pestaña)', () => {
		it('/onboarding -> atras-lineal (conservar comportamiento previo)', () => {
			expect(decidirAccionAtras('/onboarding', 'desarmado', false, false)).toEqual({
				tipo: 'atras-lineal',
			});
		});

		it('/onboarding/evaluacion -> atras-lineal', () => {
			expect(decidirAccionAtras('/onboarding/evaluacion', 'desarmado', false, false)).toEqual({
				tipo: 'atras-lineal',
			});
		});

		it('/sesion -> atras-lineal', () => {
			expect(decidirAccionAtras('/sesion', 'desarmado', false, false)).toEqual({
				tipo: 'atras-lineal',
			});
		});

		it('/biblioteca/[id] -> atras-lineal (sub-ruta no es pestaña)', () => {
			expect(decidirAccionAtras('/biblioteca/empuje', 'desarmado', false, false)).toEqual({
				tipo: 'atras-lineal',
			});
		});
	});
});
