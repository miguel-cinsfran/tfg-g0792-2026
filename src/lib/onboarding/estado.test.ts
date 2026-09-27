// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	obtener,
	actualizar,
	reiniciar,
	pasoPendiente,
	puedeVisitar,
	progresoOnboarding,
	pasoAnterior
} from './estado';
import type { Objetivo, Zona } from '$lib/motor/schema';
import { establecerCatalogo } from '$lib/catalogo/estado';
import { CatalogoSchema } from '$lib/catalogo/schema';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };

const CLAVE_PERSISTIDA = 'onboarding-estado';

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

	describe('prueba salteada por dolor declarado', () => {
		beforeEach(() => {
			establecerCatalogo(CatalogoSchema.parse(catalogoRaw).ejercicios);
		});

		function altaHastaDisponibilidad(zonas: Zona[]) {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: zonas,
				dias_semana: 3,
				duracion_sesion_min: 30
			});
		}

		it('con muñecas la prueba de push sale del orden y pasoPendiente no la pide', () => {
			altaHastaDisponibilidad(['muñecas']);
			expect(puedeVisitar('/onboarding/evaluacion/push')).toBe(false);
			expect(pasoPendiente()).toBe('/onboarding/evaluacion/pull');
			expect(progresoOnboarding('/onboarding/evaluacion/push')).toBeNull();
			expect(progresoOnboarding('/onboarding/datos')?.total).toBe(9);
		});

		it('con rodillas la prueba de push sigue en el orden', () => {
			altaHastaDisponibilidad(['rodillas']);
			expect(puedeVisitar('/onboarding/evaluacion/push')).toBe(true);
			expect(pasoPendiente()).toBe('/onboarding/evaluacion/push');
			expect(progresoOnboarding('/onboarding/datos')?.total).toBe(10);
		});
	});

	describe('pasoAnterior', () => {
		function altaCompleta(parche: Record<string, unknown> = {}) {
			actualizar({
				disclaimer_aceptado: true,
				nombre: 'Ana',
				anio_nacimiento: 1990,
				peso_kg: 65,
				objetivo: 'fuerza' as Objetivo,
				tiene_anclaje: true,
				zonas_dolor_preexistente: [] as Zona[],
				dias_semana: 3,
				duracion_sesion_min: 30,
				...parche
			});
		}

		it('desde resumen es core con y sin anclaje', () => {
			altaCompleta();
			expect(pasoAnterior('/onboarding/resumen')).toBe('/onboarding/evaluacion/core');
			actualizar({ tiene_anclaje: false });
			expect(pasoAnterior('/onboarding/resumen')).toBe('/onboarding/evaluacion/core');
		});

		it('desde legs es pull con anclaje y push sin el', () => {
			altaCompleta();
			expect(pasoAnterior('/onboarding/evaluacion/legs')).toBe('/onboarding/evaluacion/pull');
			actualizar({ tiene_anclaje: false });
			expect(pasoAnterior('/onboarding/evaluacion/legs')).toBe('/onboarding/evaluacion/push');
		});

		it('con push salteado por dolor vuelve a disponibilidad', () => {
			establecerCatalogo(CatalogoSchema.parse(catalogoRaw).ejercicios);
			altaCompleta({ zonas_dolor_preexistente: ['muñecas'] as Zona[] });
			expect(pasoAnterior('/onboarding/evaluacion/pull')).toBe('/onboarding/disponibilidad');
			actualizar({ tiene_anclaje: false });
			expect(pasoAnterior('/onboarding/evaluacion/legs')).toBe('/onboarding/disponibilidad');
			establecerCatalogo([]);
		});
	});
});

// El alta no puede reiniciarse al recargar: el sistema mata la WebView
// en segundo plano. El estado debe sobrevivir
// a la recreacion del modulo; `vi.resetModules()` + re-import simula la
// recarga. Los pasos se prueban sobre la instancia fresca del modulo,
// no sobre el import estatico de arriba.
describe('persistencia del alta', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.resetModules();
	});

	it('avanzar unos pasos y recargar vuelve al paso donde quedo, no al disclaimer', async () => {
		const primero = await import('./estado');
		primero.actualizar({
			disclaimer_aceptado: true,
			nombre: 'Ana',
			anio_nacimiento: 1990,
			peso_kg: 65,
			objetivo: 'fuerza' as Objetivo
		});
		expect(primero.pasoPendiente()).toBe('/onboarding/equipamiento');

		vi.resetModules();
		const segundo = await import('./estado');
		expect(segundo.pasoPendiente()).toBe('/onboarding/equipamiento');
		expect(segundo.obtener().nombre).toBe('Ana');
	});

	it('con basura en la clave, inicializar arranca del estado inicial sin lanzar', async () => {
		// JSON invalido: el parse lanza y el modulo no rompe.
		localStorage.setItem(CLAVE_PERSISTIDA, '{no-es-json');

		vi.resetModules();
		const modulo = await import('./estado');
		expect(modulo.pasoPendiente()).toBe('/onboarding/disclaimer');
		expect(modulo.obtener().nombre).toBeNull();

		// JSON valido con forma equivocada: la validacion lo descarta.
		localStorage.setItem(CLAVE_PERSISTIDA, JSON.stringify({ foo: 1 }));

		vi.resetModules();
		const modulo2 = await import('./estado');
		expect(modulo2.pasoPendiente()).toBe('/onboarding/disclaimer');
		expect(modulo2.obtener().nombre).toBeNull();
	});

	it('reiniciar borra lo persistido: la recarga siguiente arranca de cero', async () => {
		const primero = await import('./estado');
		primero.actualizar({ nombre: 'Ana' });
		primero.reiniciar();
		expect(localStorage.getItem(CLAVE_PERSISTIDA)).toBeNull();

		vi.resetModules();
		const segundo = await import('./estado');
		expect(segundo.obtener().nombre).toBeNull();
	});
});