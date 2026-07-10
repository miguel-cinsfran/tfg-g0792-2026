import { describe, it, expect, beforeEach } from 'vitest';
import {
	obtener,
	actualizar,
	reiniciar,
	pasoPendiente,
	puedeVisitar,
	progresoOnboarding
} from './estado';
import type { Objetivo, Zona } from '$lib/motor/schema';

describe('estado de onboarding', () => {
	beforeEach(() => {
		reiniciar();
	});

	describe('obtener / actualizar / reiniciar', () => {
		it('estado inicial tiene todos los campos null y disclaimer_aceptado false', () => {
			const e = obtener();
			expect(e.disclaimer_aceptado).toBe(false);
			expect(e.fecha_aceptacion_disclaimer).toBeNull();
			expect(e.nombre).toBeNull();
			expect(e.anio_nacimiento).toBeNull();
			expect(e.peso_kg).toBeNull();
			expect(e.altura_cm).toBeNull();
			expect(e.objetivo).toBeNull();
			expect(e.tiene_anclaje).toBeNull();
			expect(e.zonas_dolor_preexistente).toBeNull();
			expect(e.dias_semana).toBeNull();
			expect(e.duracion_sesion_min).toBeNull();
			expect(e.reps_push).toBeNull();
			expect(e.reps_pull).toBeNull();
			expect(e.reps_legs).toBeNull();
			expect(e.segundos_core).toBeNull();
		});

		it('actualizar mergea parcial y conserva campos no especificados', () => {
			actualizar({ nombre: 'Ana', peso_kg: 65 });
			const e1 = obtener();
			expect(e1.nombre).toBe('Ana');
			expect(e1.peso_kg).toBe(65);
			expect(e1.disclaimer_aceptado).toBe(false);
			expect(e1.anio_nacimiento).toBeNull();

			actualizar({ peso_kg: 66 });
			const e2 = obtener();
			expect(e2.nombre).toBe('Ana');
			expect(e2.peso_kg).toBe(66);
		});

		it('reiniciar vuelve al estado inicial', () => {
			actualizar({
				disclaimer_aceptado: true,
				fecha_aceptacion_disclaimer: 1000,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				altura_cm: 170,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: ['hombros'] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30,
				reps_push: 10,
				reps_pull: 5,
				reps_legs: 15,
				segundos_core: 30
			});
			reiniciar();
			const e = obtener();
			expect(e.disclaimer_aceptado).toBe(false);
			expect(e.nombre).toBeNull();
			expect(e.dias_semana).toBeNull();
		});
	});

	describe('pasoPendiente', () => {
		it('devuelve disclaimer cuando no se ha aceptado', () => {
			expect(pasoPendiente()).toBe('/onboarding/disclaimer');
		});

		it('avanza a datos tras aceptar disclaimer', () => {
			actualizar({ disclaimer_aceptado: true });
			expect(pasoPendiente()).toBe('/onboarding/datos');
		});

		it('avanza a objetivo tras completar datos', () => {
			actualizar({ disclaimer_aceptado: true, nombre: 'Ana', anio_nacimiento: 1990, peso_kg: 65 });
			expect(pasoPendiente()).toBe('/onboarding/objetivo');
		});

		it('avanza a equipamiento tras objetivo', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo
			});
			expect(pasoPendiente()).toBe('/onboarding/equipamiento');
		});

		it('avanza a dolor-preexistente tras equipamiento', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true
			});
			expect(pasoPendiente()).toBe('/onboarding/dolor-preexistente');
		});

		it('avanza a disponibilidad tras dolor-preexistente', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: [] as Zona[]
			});
			expect(pasoPendiente()).toBe('/onboarding/disponibilidad');
		});

		it('avanza a evaluacion/push tras disponibilidad', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: [] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30
			});
			expect(pasoPendiente()).toBe('/onboarding/evaluacion/push');
		});

		it('salta pull cuando tiene_anclaje es false', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: false,
				zonas_dolor_preexistente: [] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30,
				reps_push: 10
			});
			expect(pasoPendiente()).toBe('/onboarding/evaluacion/legs');
		});

		it('devuelve resumen cuando todos los campos estan completos', () => {
			actualizar({
				disclaimer_aceptado: true,
				fecha_aceptacion_disclaimer: 1000,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				altura_cm: 170,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: [] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30,
				reps_push: 10,
				reps_pull: 5,
				reps_legs: 15,
				segundos_core: 30
			});
			expect(pasoPendiente()).toBe('/onboarding/resumen');
		});
	});

	describe('puedeVisitar', () => {
		it('permite acceder al paso pendiente', () => {
			expect(puedeVisitar('/onboarding/disclaimer')).toBe(true);
		});

		it('permite back-nav a paso completado', () => {
			actualizar({ disclaimer_aceptado: true });
			expect(puedeVisitar('/onboarding/disclaimer')).toBe(true);
		});

		it('bloquea acceso a paso futuro', () => {
			expect(puedeVisitar('/onboarding/datos')).toBe(false);
		});

		it('ruta desconocida devuelve false', () => {
			expect(puedeVisitar('/onboarding/fantasma')).toBe(false);
		});

		it('excluye pull del orden efectivo cuando tiene_anclaje es false', () => {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: false,
				zonas_dolor_preexistente: [] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30,
				reps_push: 10
			});
			expect(puedeVisitar('/onboarding/evaluacion/pull')).toBe(false);
			expect(puedeVisitar('/onboarding/evaluacion/legs')).toBe(true);
		});
	});

	describe('progresoOnboarding', () => {
		it('datos es paso 1 y resumen es el ultimo cuando hay anclaje', () => {
			actualizar({ tiene_anclaje: true });
			const datos = progresoOnboarding('/onboarding/datos');
			const resumen = progresoOnboarding('/onboarding/resumen');
			expect(datos).not.toBeNull();
			expect(datos?.paso).toBe(1);
			expect(datos?.total).toBe(10);
			expect(resumen).not.toBeNull();
			expect(resumen?.paso).toBe(resumen?.total);
			expect(resumen?.total).toBe(10);
		});

		it('el total baja en 1 cuando tiene_anclaje es false', () => {
			actualizar({ tiene_anclaje: false });
			const datos = progresoOnboarding('/onboarding/datos');
			expect(datos?.total).toBe(9);
		});

		it('disclaimer y raiz devuelven null', () => {
			actualizar({ tiene_anclaje: true });
			expect(progresoOnboarding('/onboarding/disclaimer')).toBeNull();
			expect(progresoOnboarding('/onboarding')).toBeNull();
		});

		it('ruta ajena al flujo devuelve null', () => {
			actualizar({ tiene_anclaje: true });
			expect(progresoOnboarding('/onboarding/fantasma')).toBeNull();
			expect(progresoOnboarding('/biblioteca')).toBeNull();
		});

		it('pull queda excluido del progreso cuando tiene_anclaje es false', () => {
			actualizar({ tiene_anclaje: false });
			expect(progresoOnboarding('/onboarding/evaluacion/pull')).toBeNull();
		});
	});
});