import { describe, it, expect } from 'vitest';
import { generarSesion, recortarAPresupuesto, duracionEstimada } from './generador';
import type { ItemPlanConPrioridad, Prioridad } from './generador';
import type { Ejercicio, EjercicioEjecutado } from './schema';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';
import { estadoBase } from '../../../tests/fixtures/estado-base';
import { perfilBase } from '../../../tests/fixtures/perfil-base';
import { sesionBase } from '../../../tests/fixtures/sesion-base';
import { AHORA, diasAntes } from '../../../tests/fixtures/ahora';

// Catalogo minimo que cubre los 6 slots del template FULL_BODY real:
// PUSH_H, PULL_H, SQUAT (novedad, alta), PUSH_V, HINGE (novedad, media),
// CORE ANTI_EXTENSION (sin novedad, baja). Perfil hipertrofia:
// series 3, rir 2, descanso 90 (valores reales de objetivos.json).
function catalogoMinimo(): Ejercicio[] {
	return [
		ejercicioBase({ id: 'ej-push-h', patron: 'PUSH_H', zonas_involucradas: ['hombros'] }),
		ejercicioBase({ id: 'ej-pull-h', patron: 'PULL_H', zonas_involucradas: ['codos'] }),
		ejercicioBase({ id: 'ej-squat', patron: 'SQUAT', zonas_involucradas: ['rodillas'] }),
		ejercicioBase({ id: 'ej-push-v', patron: 'PUSH_V', zonas_involucradas: ['hombros'] }),
		ejercicioBase({ id: 'ej-hinge', patron: 'HINGE', zonas_involucradas: ['lumbar'] }),
		ejercicioBase({
			id: 'ej-core',
			patron: 'CORE',
			subpatron: 'ANTI_EXTENSION',
			zonas_involucradas: ['lumbar'],
			reps_iniciales: 20,
		}),
	];
}

function ejecutado(ejercicio_id: string): EjercicioEjecutado {
	return {
		ejercicio_id,
		series_planificadas: 3,
		series_completadas: 3,
		reps_planificadas: 10,
		reps_reales: [10, 10, 10],
		rir_declarado: [3, 3, 1],
		zonas_dolor_reportadas: [],
	};
}

describe('generarSesion (ALG-04)', () => {
	it('llena los 6 slots de FULL_BODY y aplica presupuesto del perfil', () => {
		// perfilBase() tiene duracion_sesion_min=30 y objetivo=hipertrofia.
		// 6 ejercicios: 3 alta×3 series + 3 media/baja×2 = 15 series, descanso 90.
		// Base = 0 + 15*(40+90) = 1950 s. Presupuesto = 1800 s. Se recorta.
		const r = generarSesion('FULL_BODY', perfilBase(), catalogoMinimo(), [], []);
		expect(r.patrones_sin_pool).toEqual([]);
		expect(r.plan).toHaveLength(6);
		expect(r.plan.map((p) => p.ejercicio_id)).toEqual([
			'ej-push-h',
			'ej-pull-h',
			'ej-squat',
			'ej-push-v',
			'ej-hinge',
			'ej-core',
		]);
		// 30 min recorta: con calentamientoSeg=0, solo hace falta bajar 2 series ALTA a 2.
		expect(r.plan.map((p) => p.series)).toEqual([2, 2, 3, 2, 2, 2]);
		for (const p of r.plan) {
			expect(p.rir_objetivo).toBe(2);
			expect(p.descanso_segundos).toBe(90);
		}
		// reps desde reps_iniciales al no haber estado.
		expect(r.plan[0].reps_objetivo).toBe(10);
		expect(r.plan[5].reps_objetivo).toBe(20);
	});

	it('usa reps_objetivo del estado cuando existe', () => {
		const estados = [estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 14 })];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogoMinimo(), estados, []);
		expect(r.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(14);
	});

	it('excluye ejercicios por encima del nivel del usuario y reporta pool vacio', () => {
		const catalogo = catalogoMinimo().map((e) =>
			e.id === 'ej-squat' ? { ...e, nivel_requerido: 'intermedio' as const } : e,
		);
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, [], []);
		expect(r.patrones_sin_pool).toEqual(['SQUAT']);
		expect(r.plan).toHaveLength(5);
	});

	it('un estado propio habilita un ejercicio por encima del nivel (variante elegida)', () => {
		// La eleccion explicita (cambio de variante, sugerencia aceptada)
		// crea estado; el filtro conservador de nivel no la pisa.
		const catalogo = catalogoMinimo().map((e) =>
			e.id === 'ej-squat' ? { ...e, nivel_requerido: 'intermedio' as const } : e,
		);
		const estados = [estadoBase({ ejercicio_id: 'ej-squat', reps_objetivo: 8 })];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, []);
		expect(r.patrones_sin_pool).toEqual([]);
		expect(r.plan.map((p) => p.ejercicio_id)).toContain('ej-squat');
	});

	it('un usuario avanzado puede recibir ejercicios de nivel menor', () => {
		const r = generarSesion(
			'FULL_BODY',
			perfilBase({ nivel_experiencia: 'avanzado' }),
			catalogoMinimo(),
			[],
			[],
		);
		expect(r.plan).toHaveLength(6);
	});

	it('excluye ejercicios bloqueados', () => {
		const estados = [estadoBase({ ejercicio_id: 'ej-pull-h', bloqueado: true })];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogoMinimo(), estados, []);
		expect(r.patrones_sin_pool).toEqual(['PULL_H']);
	});

	it('excluye ejercicios que tocan zonas de dolor preexistente', () => {
		const perfil = perfilBase({ zonas_dolor_preexistente: ['rodillas'] });
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), [], []);
		expect(r.patrones_sin_pool).toEqual(['SQUAT']);
	});

	it('respeta el subpatron del slot de CORE', () => {
		const catalogo = catalogoMinimo().map((e) =>
			e.id === 'ej-core' ? { ...e, subpatron: 'ANTI_ROTATION' as const } : e,
		);
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, [], []);
		expect(r.patrones_sin_pool).toEqual(['CORE']);
	});

	it('novedad: prefiere el candidato no usado en las sesiones recientes', () => {
		// Dos PUSH_H: el usado recientemente quedaria primero por fecha
		// null del otro... al reves: el fresco no tiene estado (null =
		// mas antiguo) y ademas es fresco. Forzamos el caso interesante:
		// el RECIENTE tiene fecha_ultimo_uso mas vieja que el fresco, y
		// aun asi pierde porque la novedad filtra primero.
		const catalogo = [
			...catalogoMinimo(),
			ejercicioBase({ id: 'ej-push-h-2', patron: 'PUSH_H', zonas_involucradas: ['hombros'] }),
		];
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', fecha_ultimo_uso: diasAntes(10) }),
			estadoBase({ ejercicio_id: 'ej-push-h-2', fecha_ultimo_uso: diasAntes(1) }),
		];
		const recientes = [
			sesionBase({ id: 's1', fecha: diasAntes(2), ejercicios: [ejecutado('ej-push-h')] }),
		];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, recientes);
		expect(r.plan[0].ejercicio_id).toBe('ej-push-h-2');
	});

	it('novedad: si todos los candidatos son recientes, cae al pool completo', () => {
		const catalogo = [
			...catalogoMinimo(),
			ejercicioBase({ id: 'ej-push-h-2', patron: 'PUSH_H', zonas_involucradas: ['hombros'] }),
		];
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', fecha_ultimo_uso: diasAntes(4) }),
			estadoBase({ ejercicio_id: 'ej-push-h-2', fecha_ultimo_uso: diasAntes(2) }),
		];
		const recientes = [
			sesionBase({
				id: 's1',
				fecha: diasAntes(2),
				ejercicios: [ejecutado('ej-push-h'), ejecutado('ej-push-h-2')],
			}),
		];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, recientes);
		// Del pool completo gana el de uso menos reciente.
		expect(r.plan[0].ejercicio_id).toBe('ej-push-h');
	});

	it('la ventana de historial respeta RULE-SEL-HISTORIAL-SESIONES (2)', () => {
		// ej-push-h aparece hace 3 sesiones: fuera de la ventana de 2,
		// asi que sigue contando como fresco y gana por fecha mas vieja.
		const catalogo = [
			...catalogoMinimo(),
			ejercicioBase({ id: 'ej-push-h-2', patron: 'PUSH_H', zonas_involucradas: ['hombros'] }),
		];
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', fecha_ultimo_uso: diasAntes(6) }),
			estadoBase({ ejercicio_id: 'ej-push-h-2', fecha_ultimo_uso: diasAntes(1) }),
		];
		const recientes = [
			sesionBase({ id: 's1', fecha: diasAntes(6), ejercicios: [ejecutado('ej-push-h')] }),
			sesionBase({ id: 's2', fecha: diasAntes(4), ejercicios: [] }),
			sesionBase({ id: 's3', fecha: diasAntes(2), ejercicios: [] }),
		];
		const r = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, recientes);
		expect(r.plan[0].ejercicio_id).toBe('ej-push-h');
	});

	it('es determinista: mismo input produce identico output', () => {
		const catalogo = catalogoMinimo();
		const estados = [estadoBase({ ejercicio_id: 'ej-push-h', fecha_ultimo_uso: AHORA })];
		const a = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, []);
		const b = generarSesion('FULL_BODY', perfilBase(), catalogo, estados, []);
		expect(a).toEqual(b);
	});

	it('UPPER usa su propio template (5 slots, sin piernas)', () => {
		const catalogo = [
			...catalogoMinimo(),
			ejercicioBase({ id: 'ej-pull-v', patron: 'PULL_V', zonas_involucradas: ['codos'] }),
		];
		const r = generarSesion('UPPER', perfilBase(), catalogo, [], []);
		expect(r.patrones_sin_pool).toEqual([]);
		expect(r.plan).toHaveLength(5);
		expect(r.plan.some((p) => p.ejercicio_id === 'ej-squat')).toBe(false);
	});
});

describe('recortarAPresupuesto (ALG-04 + REQ-PRES-*)', () => {
	it('presupuesto holgado: no toca nada', () => {
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'b', series: 2, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'baja' },
		];
		const r = recortarAPresupuesto(items, 60 * 60, 40, 0, 2);
		expect(r.map((i) => i.entry.series)).toEqual([3, 2]);
	});

	it('presupuesto 0: devuelve el piso (solo ALTA en MIN_SERIES)', () => {
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a', series: 4, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'b', series: 3, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'media' },
			{ entry: { ejercicio_id: 'c', series: 3, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'baja' },
		];
		const r = recortarAPresupuesto(items, 0, 40, 0, 2);
		// Piso: solo 'a' (alta) en MIN_SERIES. Las media y baja se quitaron.
		expect(r.map((i) => i.entry.ejercicio_id)).toEqual(['a']);
		expect(r[0].entry.series).toBe(2);
	});

	it('cascada completa: agota series por tier y luego quita ejercicios baja', () => {
		// 9 series (a1 alta 3, b1/b2 baja 3), descanso 90: base = 0 + 9*130 = 1170.
		// Presupuesto 600 fuerza: pasada 1 baja b1 y b2 a 2, luego a1 a 2 (todos en MIN);
		// pasada 2 quita b1 (baja), queda a1 + b2: 0 + 4*130 = 520 <= 600.
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'b1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'baja' },
			{ entry: { ejercicio_id: 'b2', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'baja' },
		];
		const r = recortarAPresupuesto(items, 600, 40, 0, 2);
		expect(r.map((i) => i.entry.ejercicio_id)).toEqual(['a1', 'b2']);
		expect(r[0].entry.series).toBe(2);
		expect(r[1].entry.series).toBe(2);
	});

	it('pasa 1 simple: baja una serie del tier mas bajo', () => {
		// Plan: alta(3) + baja(3), descanso 90.
		// Total = 0 + 6*(40+90) = 0 + 780 = 780. Presupuesto 650.
		// Baja baja de 3→2: total = 0 + 5*130 = 650. Entra.
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'b1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'baja' },
		];
		const r = recortarAPresupuesto(items, 650, 40, 0, 2);
		expect(r.find((i) => i.entry.ejercicio_id === 'b1')?.entry.series).toBe(2);
		expect(r.find((i) => i.entry.ejercicio_id === 'a1')?.entry.series).toBe(3);
	});

	it('pasa 2: cuando todos llegan a MIN_SERIES, quita ejercicios baja->media sin tocar alta', () => {
		// 2 alta (ya en 2) + 1 media (ya en 2) + 1 baja (ya en 2). Descanso 180.
		// Costo por serie = 40 + 180 = 220. Total = 0 + 6*220 = 1320.
		// Presupuesto: 500. No entra. Pasada 1 no puede (todo en MIN). Pasada 2 quita baja primero.
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a1', series: 2, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'a2', series: 2, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'm1', series: 2, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'media' },
			{ entry: { ejercicio_id: 'b1', series: 2, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'baja' },
		];
		const r = recortarAPresupuesto(items, 500, 40, 0, 2);
		// Las baja se quitaron, despues las media, hasta entrar. Los alta se quedan.
		const ids = r.map((i) => i.entry.ejercicio_id);
		expect(ids).toContain('a1');
		expect(ids).toContain('a2');
		expect(ids).not.toContain('b1');
		expect(ids).not.toContain('m1');
	});

	it('piso: solo quedan ALTA y no entra, devuelve as-is', () => {
		// 2 alta a 4 series, descanso 180. Costo = 0 + 8*220 = 1760. Presupuesto 200.
		const items: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a1', series: 4, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'a2', series: 4, reps_objetivo: 5, rir_objetivo: 2, descanso_segundos: 180 }, prioridad: 'alta' },
		];
		const r = recortarAPresupuesto(items, 200, 40, 0, 2);
		// Las alta bajan a MIN_SERIES=2 pero aun no entra. Piso: todas en 2.
		expect(r.map((i) => i.entry.ejercicio_id)).toEqual(['a1', 'a2']);
		expect(r.every((i) => i.entry.series === 2)).toBe(true);
	});

	it('determinismo: misma entrada -> mismo plan en dos llamadas', () => {
		const itemsA: ItemPlanConPrioridad[] = [
			{ entry: { ejercicio_id: 'a1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'alta' },
			{ entry: { ejercicio_id: 'b1', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 }, prioridad: 'baja' },
		];
		const itemsB = itemsA.map((i) => ({ entry: { ...i.entry }, prioridad: i.prioridad }));
		const ra = recortarAPresupuesto(itemsA, 600, 40, 0, 2);
		const rb = recortarAPresupuesto(itemsB, 600, 40, 0, 2);
		expect(ra.map((i) => i.entry.series)).toEqual(rb.map((i) => i.entry.series));
		// Pureza: la entrada no se muta (trabaja sobre una copia).
		expect(itemsA.map((i) => i.entry.series)).toEqual([3, 3]);
		expect(itemsA).toHaveLength(2);
	});
});

describe('generarSesion + presupuesto (ALG-04 REQ-PRES-007..009)', () => {
	it('45 min + hipertrofia FULL_BODY: plan intacto, 15 series', () => {
		const r = generarSesion('FULL_BODY', perfilBase({ duracion_sesion_min: 45 }), catalogoMinimo(), [], []);
		expect(r.patrones_sin_pool).toEqual([]);
		// 3 alta x 3 + 3 x 2 = 15 series
		expect(r.plan).toHaveLength(6);
		expect(r.plan.reduce((acc, p) => acc + p.series, 0)).toBe(15);
		// 0 + 15*(40+90) = 0 + 1950 = 1950 s = 32.5 min. < 45*60=2700.
		const items = r.plan.map((p, i) => ({
			entry: p,
			prioridad: ['alta', 'alta', 'alta', 'media', 'media', 'baja'][i] as Prioridad,
		}));
		expect(duracionEstimada(items, 40, 0)).toBeLessThanOrEqual(45 * 60);
	});

	it('20 min + fuerza FULL_BODY: recorta, nunca quita ALTA, respeta MIN_SERIES', () => {
		const r = generarSesion(
			'FULL_BODY',
			perfilBase({ duracion_sesion_min: 20, objetivo: 'fuerza' }),
			catalogoMinimo(),
			[],
			[],
		);
		expect(r.plan.length).toBeGreaterThan(0);
		// Las ALTA (PUSH_H, PULL_H, SQUAT en FULL_BODY) siempre presentes.
		for (const id of ['ej-push-h', 'ej-pull-h', 'ej-squat']) {
			expect(r.plan.find((p) => p.ejercicio_id === id)).toBeDefined();
		}
		// Ningun ejercicio por debajo de MIN_SERIES=2.
		for (const p of r.plan) {
			expect(p.series).toBeGreaterThanOrEqual(2);
		}
	});

	it('45 min + fuerza FULL_BODY: recorta, nunca quita ALTA', () => {
		const r = generarSesion(
			'FULL_BODY',
			perfilBase({ duracion_sesion_min: 45, objetivo: 'fuerza' }),
			catalogoMinimo(),
			[],
			[],
		);
		// Las ALTA (PUSH_H, PULL_H, SQUAT) siempre presentes.
		for (const id of ['ej-push-h', 'ej-pull-h', 'ej-squat']) {
			expect(r.plan.find((p) => p.ejercicio_id === id)).toBeDefined();
		}
	});

	it('determinismo: misma entrada -> mismo plan', () => {
		const a = generarSesion(
			'FULL_BODY',
			perfilBase({ duracion_sesion_min: 20, objetivo: 'fuerza' }),
			catalogoMinimo(),
			[],
			[],
		);
		const b = generarSesion(
			'FULL_BODY',
			perfilBase({ duracion_sesion_min: 20, objetivo: 'fuerza' }),
			catalogoMinimo(),
			[],
			[],
		);
		expect(a).toEqual(b);
	});
});

describe('generarSesion + reintroduccion gradual (ALG-04 + ALG-08)', () => {
	// 45 min + hipertrofia = plan intacto (15 series), necesario para
	// que los asserts de series no se mezclen con el recorte de presupuesto.
	const perfil = perfilBase({ duracion_sesion_min: 45, objetivo: 'hipertrofia' });

	it('reintroduccion_sesiones_restantes=2 reduce reps del plan al 50% (floor), sin tocar series', () => {
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10, reintroduccion_sesiones_restantes: 2 }),
		];
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), estados, []);
		const push = r.plan.find((p) => p.ejercicio_id === 'ej-push-h');
		expect(push?.reps_objetivo).toBe(5); // floor(10 * 50 / 100) = 5
		// series intactas (prioridad ALTA en hipertrofia)
		expect(push?.series).toBe(3);
	});

	it('reintroduccion_sesiones_restantes=0 o null -> plan con reps reales del estado', () => {
		const conCero = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10, reintroduccion_sesiones_restantes: 0 }),
		];
		const rCero = generarSesion('FULL_BODY', perfil, catalogoMinimo(), conCero, []);
		expect(rCero.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(10);

		const conNull = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10, reintroduccion_sesiones_restantes: null }),
		];
		const rNull = generarSesion('FULL_BODY', perfil, catalogoMinimo(), conNull, []);
		expect(rNull.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(10);

		// sin el campo: tratar como null (registros previos a esta version)
		const conUndefined = [estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10 })];
		const rUndef = generarSesion('FULL_BODY', perfil, catalogoMinimo(), conUndefined, []);
		expect(rUndef.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(10);
	});

	it('piso 1: con reps_objetivo=1, la reduccion del 50% deja 1, no 0', () => {
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 1, reintroduccion_sesiones_restantes: 2 }),
		];
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), estados, []);
		expect(r.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(1);
	});

	it('la reduccion NO muta el estado.reps_objetivo almacenado', () => {
		// Lo que el motor escribe al cerrar persiste en la db; la reduccion
		// del plan es solo para esta sesion. La progresion acumulada vive en
		// el estado y no debe bajar.
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10, reintroduccion_sesiones_restantes: 2 }),
		];
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), estados, []);
		// la entrada del array estados original no se toca
		expect(estados[0].reps_objetivo).toBe(10);
		// el plan lleva 5 (reduccion) sin tocar el estado
		expect(r.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(5);
	});

	it('reintroduccion_sesiones_restantes=1 todavia aplica la reduccion (es > 0)', () => {
		const estados = [
			estadoBase({ ejercicio_id: 'ej-push-h', reps_objetivo: 10, reintroduccion_sesiones_restantes: 1 }),
		];
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), estados, []);
		expect(r.plan.find((p) => p.ejercicio_id === 'ej-push-h')?.reps_objetivo).toBe(5);
	});

	it('ejercicio bloqueado no entra al plan aunque tenga reintroduccion pendiente', () => {
		// Caso defensa (ALG-08): re-bloqueado durante reintroduccion. El
		// contador puede tener un valor residual, pero el ejercicio no
		// debe contar ni recibir reduccion.
		const estados = [
			estadoBase({
				ejercicio_id: 'ej-push-h',
				bloqueado: true,
				reps_objetivo: 10,
				reintroduccion_sesiones_restantes: 1,
			}),
		];
		const r = generarSesion('FULL_BODY', perfil, catalogoMinimo(), estados, []);
		expect(r.plan.find((p) => p.ejercicio_id === 'ej-push-h')).toBeUndefined();
		expect(r.patrones_sin_pool).toContain('PUSH_H');
	});
});
