import { describe, it, expect } from 'vitest';
import { esRutaConBarraDePestanas } from './barra-pestanas';

describe('esRutaConBarraDePestanas', () => {
	it('muestra la barra en la raiz /', () => {
		expect(esRutaConBarraDePestanas('/')).toBe(true);
	});

	it('muestra la barra en /biblioteca', () => {
		expect(esRutaConBarraDePestanas('/biblioteca')).toBe(true);
	});

	it('muestra la barra en /progreso', () => {
		expect(esRutaConBarraDePestanas('/progreso')).toBe(true);
	});

	it('muestra la barra en /config', () => {
		expect(esRutaConBarraDePestanas('/config')).toBe(true);
	});

	it('OCULTA la barra en /sesion', () => {
		expect(esRutaConBarraDePestanas('/sesion')).toBe(false);
	});

	it('OCULTA la barra en sub-rutas de /sesion', () => {
		// Cualquier sub-ruta que cuelgue de /sesion (no hay hoy, pero el
		// guard las cubre) tambien oculta la barra por consistencia.
		expect(esRutaConBarraDePestanas('/sesion/alguna-sub')).toBe(false);
	});

	it('OCULTA la barra en /onboarding (regla existente)', () => {
		expect(esRutaConBarraDePestanas('/onboarding')).toBe(false);
	});

	it('OCULTA la barra en /onboarding/disclaimer, /onboarding/evaluacion, etc.', () => {
		expect(esRutaConBarraDePestanas('/onboarding/disclaimer')).toBe(false);
		expect(esRutaConBarraDePestanas('/onboarding/evaluacion/push')).toBe(false);
		expect(esRutaConBarraDePestanas('/onboarding/resumen')).toBe(false);
	});

	it('OCULTA la barra en /ayuda (flujo lineal: se sale con atras)', () => {
		expect(esRutaConBarraDePestanas('/ayuda')).toBe(false);
	});
});
