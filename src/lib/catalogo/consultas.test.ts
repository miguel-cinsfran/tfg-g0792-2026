import { describe, it, expect, beforeEach } from 'vitest';
import { popularCatalogo } from './cargar';
import { obtenerEjercicio, obtenerCatalogoPorPatron, obtenerSustituto } from './consultas';

const ejercicioPushH = {
	id: 'fixture-001',
	nombre: 'Flexion pared',
	patron: 'PUSH_H' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['hombros' as const, 'codos' as const, 'muñecas' as const],
	reps_iniciales: 10,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

const ejercicioPushV = {
	id: 'fixture-002',
	nombre: 'Pike push-up',
	patron: 'PUSH_V' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['hombros' as const, 'codos' as const, 'muñecas' as const, 'cuello' as const],
	reps_iniciales: 6,
	progresion_id: null,
	regresion_id: null,
	sustituciones: { muñecas: 'fixture-001' },
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

const ejercicioCoreAntiExt = {
	id: 'fixture-003',
	nombre: 'Plancha',
	patron: 'CORE' as const,
	subpatron: 'ANTI_EXTENSION' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['lumbar' as const, 'hombros' as const],
	reps_iniciales: 20,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

const ejercicioCoreRot = {
	id: 'fixture-004',
	nombre: 'Plancha lateral',
	patron: 'CORE' as const,
	subpatron: 'ANTI_ROTATION' as const,
	nivel_requerido: 'intermedio' as const,
	zonas_involucradas: ['hombros' as const],
	reps_iniciales: 15,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

const ejercicioCoreSinSubpatron = {
	id: 'fixture-006',
	nombre: 'Core generico',
	patron: 'CORE' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['lumbar' as const],
	reps_iniciales: 12,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

const ejercicioPushHSinMunecas = {
	id: 'fixture-005',
	nombre: 'Flexion inclinada',
	patron: 'PUSH_H' as const,
	nivel_requerido: 'principiante' as const,
	zonas_involucradas: ['hombros' as const, 'codos' as const],
	reps_iniciales: 8,
	progresion_id: null,
	regresion_id: null,
	sustituciones: {},
	descripcion: {
		posicion_inicial: ['a'],
		ejecucion: ['b'],
		referencias_propioceptivas: ['c'],
		errores_comunes: ['d'],
	},
};

beforeEach(() => {
	popularCatalogo(
		{ ejercicios: [ejercicioPushH, ejercicioPushV, ejercicioCoreAntiExt, ejercicioCoreRot, ejercicioPushHSinMunecas, ejercicioCoreSinSubpatron] },
	);
});

describe('obtenerEjercicio', () => {
	it('ID inexistente retorna undefined', () => {
		expect(obtenerEjercicio('no-existe')).toBeUndefined();
	});

	it('ID existente retorna el ejercicio completo', () => {
		const ej = obtenerEjercicio('fixture-001');
		expect(ej).toBeDefined();
		expect(ej!.id).toBe('fixture-001');
		expect(ej!.patron).toBe('PUSH_H');
	});
});

describe('obtenerCatalogoPorPatron', () => {
	it('filtra por patron: solo PUSH_H', () => {
		const resultado = obtenerCatalogoPorPatron('PUSH_H');
		expect(resultado).toHaveLength(2);
		expect(resultado.every((e) => e.patron === 'PUSH_H')).toBe(true);
	});

	it('filtra por patron y subpatron: CORE con ANTI_EXTENSION', () => {
		const resultado = obtenerCatalogoPorPatron('CORE', 'ANTI_EXTENSION');
		expect(resultado).toHaveLength(1);
		expect(resultado[0].id).toBe('fixture-003');
	});
});

describe('obtenerSustituto', () => {
	it('excluye por zona — PUSH_H sin muñecas', () => {
		const ej001 = obtenerEjercicio('fixture-001')!;
		const sustitutos = obtenerSustituto(ej001, 'muñecas');
		expect(sustitutos).toHaveLength(1);
		expect(sustitutos[0].id).toBe('fixture-005');
	});

	it('excluye por id propio — fixture-001 no aparece en su propio sustituto', () => {
		const ej001 = obtenerEjercicio('fixture-001')!;
		const sustitutos = obtenerSustituto(ej001, 'lumbar');
		const ids = sustitutos.map((e) => e.id);
		expect(ids).not.toContain('fixture-001');
	});

	it('distinto patrón queda excluido — PUSH_V no aparece en sustitutos de PUSH_H', () => {
		const ej001 = obtenerEjercicio('fixture-001')!;
		const sustitutos = obtenerSustituto(ej001, 'cadera');
		const ids = sustitutos.map((e) => e.id);
		expect(ids).not.toContain('fixture-002');
	});

	it('input sin subpatron excluye candidatos con subpatron', () => {
		const ej006 = obtenerEjercicio('fixture-006')!;
		const sustitutos = obtenerSustituto(ej006, 'codos');
		const ids = sustitutos.map((e) => e.id);
		expect(ids).not.toContain('fixture-003');
		expect(ids).not.toContain('fixture-004');
	});
});

