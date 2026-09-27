import { describe, it, expect } from 'vitest';
import { PATRONES, TIPOS_SESION, ZONAS } from '$lib/motor/schema';
import { etiquetaPatron, etiquetaTipoSesion, etiquetaZona, descripcionObjetivo } from './etiquetas';

describe('etiquetaPatron', () => {
	it('cubre los 8 patrones con etiquetas no vacias y distintas del crudo', () => {
		PATRONES.forEach((p) => {
			const etiqueta = etiquetaPatron(p);
			expect(etiqueta.length, `etiqueta para ${p} no vacia`).toBeGreaterThan(0);
			expect(etiqueta, `etiqueta para ${p} distinta del valor crudo`).not.toBe(p);
		});
	});

	it('usa lenguaje llano sin jerga de plano ni siglas', () => {
		expect(etiquetaPatron('PUSH_H')).toBe('empujar hacia delante');
		expect(etiquetaPatron('PUSH_V')).toBe('empujar hacia arriba');
		expect(etiquetaPatron('PULL_H')).toBe('tirar hacia ti');
		expect(etiquetaPatron('PULL_V')).toBe('tirar desde arriba');
		expect(etiquetaPatron('SQUAT')).toBe('sentadillas');
		expect(etiquetaPatron('HINGE')).toBe('cadera');
		expect(etiquetaPatron('UNILATERAL')).toBe('una pierna');
		expect(etiquetaPatron('CORE')).toBe('abdomen');
	});
});

describe('descripcionObjetivo', () => {
	it('fuerza e hipertrofia hablan de peso corporal, no de pesas', () => {
		expect(descripcionObjetivo('fuerza')).toBe('Ejercicios más difíciles, pocas repeticiones');
		expect(descripcionObjetivo('hipertrofia')).toBe('Ganar músculo');
	});

	it('resistencia y pérdida de peso quedan como estaban', () => {
		expect(descripcionObjetivo('resistencia')).toBe('Sostener más repeticiones');
		expect(descripcionObjetivo('perdida_peso')).toBe('Gastar más calorías');
	});
});

describe('etiquetaTipoSesion', () => {
	it('cubre los 3 tipos con etiquetas no vacias y distintas del crudo', () => {
		TIPOS_SESION.forEach((t) => {
			const etiqueta = etiquetaTipoSesion(t);
			expect(etiqueta.length, `etiqueta para ${t} no vacia`).toBeGreaterThan(0);
			expect(etiqueta, `etiqueta para ${t} distinta del valor crudo`).not.toBe(t);
		});
	});
});

describe('etiquetaZona', () => {
	it('cubre las 8 zonas con etiquetas no vacias', () => {
		ZONAS.forEach((z) => {
			const etiqueta = etiquetaZona(z);
			expect(etiqueta.length, `etiqueta para ${z} no vacia`).toBeGreaterThan(0);
		});
	});
});