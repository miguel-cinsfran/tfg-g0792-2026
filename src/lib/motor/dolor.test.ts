import { describe, it, expect } from 'vitest';
import {
	buscarSustituto,
	registrarZonasDolor,
	aplicarSustitucion,
	bloqueosVencidos,
	reactivarEjercicio,
} from './dolor';
import { crearEstadoInicial } from './cierre';
import { aplicarSerieCompletada } from './serie';
import type { EjercicioPlanificado } from './schema';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';
import { estadoBase } from '../../../tests/fixtures/estado-base';
import { AHORA, DIA_MS, diasAntes } from '../../../tests/fixtures/ahora';

describe('buscarSustituto (ALG-06 paso 4)', () => {
	it('respeta el mapa de sustituciones del ejercicio primero', () => {
		const actual = ejercicioBase({
			id: 'ej-a',
			sustituciones: { hombros: 'ej-mapa' },
			zonas_involucradas: ['hombros'],
		});
		const mapa = ejercicioBase({ id: 'ej-mapa', zonas_involucradas: ['lumbar'] });
		// hay otro candidato por filtro, pero el mapa tiene prioridad
		const porFiltro = ejercicioBase({ id: 'ej-filtro', zonas_involucradas: ['lumbar'] });
		const r = buscarSustituto(actual, ['hombros'], [actual, mapa, porFiltro], [], 'principiante');
		expect(r?.id).toBe('ej-mapa');
	});

	it('salta el candidato del mapa si esta bloqueado y cae al filtro', () => {
		const actual = ejercicioBase({ id: 'ej-a', sustituciones: { hombros: 'ej-mapa' } });
		const mapa = ejercicioBase({ id: 'ej-mapa' });
		const porFiltro = ejercicioBase({ id: 'ej-filtro', zonas_involucradas: ['lumbar'] });
		const estados = [estadoBase({ ejercicio_id: 'ej-mapa', bloqueado: true })];
		const r = buscarSustituto(actual, ['hombros'], [actual, mapa, porFiltro], estados, 'principiante');
		expect(r?.id).toBe('ej-filtro');
	});

	it('ignora referencias colgadas del mapa (id inexistente en catalogo)', () => {
		const actual = ejercicioBase({ id: 'ej-a', sustituciones: { hombros: 'ej-no-existe' } });
		const porFiltro = ejercicioBase({ id: 'ej-filtro', zonas_involucradas: ['lumbar'] });
		const r = buscarSustituto(actual, ['hombros'], [actual, porFiltro], [], 'principiante');
		expect(r?.id).toBe('ej-filtro');
	});

	it('el filtro respeta patron, nivel, bloqueo y zonas', () => {
		const actual = ejercicioBase({ id: 'ej-a' });
		const otroPatron = ejercicioBase({ id: 'ej-patron', patron: 'SQUAT', zonas_involucradas: [] });
		const nivelAlto = ejercicioBase({
			id: 'ej-nivel',
			nivel_requerido: 'avanzado',
			zonas_involucradas: [],
		});
		const bloqueado = ejercicioBase({ id: 'ej-bloq', zonas_involucradas: [] });
		const tocaZona = ejercicioBase({ id: 'ej-zona', zonas_involucradas: ['hombros'] });
		const valido = ejercicioBase({ id: 'ej-ok', zonas_involucradas: ['lumbar'] });
		const estados = [estadoBase({ ejercicio_id: 'ej-bloq', bloqueado: true })];
		const r = buscarSustituto(
			actual,
			['hombros'],
			[actual, otroPatron, nivelAlto, bloqueado, tocaZona, valido],
			estados,
			'principiante',
		);
		expect(r?.id).toBe('ej-ok');
	});

	it('entre varios validos gana el de uso menos reciente', () => {
		const actual = ejercicioBase({ id: 'ej-a' });
		const reciente = ejercicioBase({ id: 'ej-reciente', zonas_involucradas: [] });
		const antiguo = ejercicioBase({ id: 'ej-antiguo', zonas_involucradas: [] });
		const estados = [
			estadoBase({ ejercicio_id: 'ej-reciente', fecha_ultimo_uso: diasAntes(1) }),
			estadoBase({ ejercicio_id: 'ej-antiguo', fecha_ultimo_uso: diasAntes(9) }),
		];
		const r = buscarSustituto(actual, ['hombros'], [actual, reciente, antiguo], estados, 'principiante');
		expect(r?.id).toBe('ej-antiguo');
	});

	it('devuelve null cuando el pool queda vacio (ALG-07)', () => {
		const actual = ejercicioBase({ id: 'ej-a' });
		expect(buscarSustituto(actual, ['hombros'], [actual], [], 'principiante')).toBeNull();
	});
});

function plan(): EjercicioPlanificado[] {
	return [
		{ ejercicio_id: 'ej-a', series: 3, reps_objetivo: 10, rir_objetivo: 2, descanso_segundos: 90 },
	];
}

describe('registrarZonasDolor', () => {
	it('crea la entrada si el dolor llega antes de la primera serie', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const s1 = registrarZonasDolor(s0, ['hombros', 'codos']);
		expect(s1.ejecutados).toHaveLength(1);
		expect(s1.ejecutados[0].series_completadas).toBe(0);
		expect(s1.ejecutados[0].zonas_dolor_reportadas).toEqual(['hombros', 'codos']);
	});

	it('acumula zonas sin duplicar sobre una entrada con series hechas', () => {
		const s0 = aplicarSerieCompletada(crearEstadoInicial(plan(), 'FULL_BODY', AHORA), 10, 3, AHORA);
		const s1 = registrarZonasDolor(registrarZonasDolor(s0, ['hombros']), ['hombros', 'lumbar']);
		expect(s1.ejecutados[0].zonas_dolor_reportadas).toEqual(['hombros', 'lumbar']);
		expect(s1.ejecutados[0].series_completadas).toBe(1);
	});
});

describe('aplicarSustitucion (ALG-06 paso 5)', () => {
	it('reemplaza el slot actual heredando series, rir y descanso', () => {
		const s0 = aplicarSerieCompletada(crearEstadoInicial(plan(), 'FULL_BODY', AHORA), 10, 3, AHORA);
		const sustituto = ejercicioBase({ id: 'ej-sust', reps_iniciales: 6 });
		const s1 = aplicarSustitucion(s0, sustituto, [], AHORA);
		expect(s1.plan[0]).toEqual({
			ejercicio_id: 'ej-sust',
			series: 3,
			reps_objetivo: 6,
			rir_objetivo: 2,
			descanso_segundos: 90,
		});
		expect(s1.indice_serie).toBe(0);
		// lo ya hecho del ejercicio original se conserva en ejecutados
		expect(s1.ejecutados[0].ejercicio_id).toBe('ej-a');
	});

	it('toma las reps del estado del sustituto si existe', () => {
		const s0 = crearEstadoInicial(plan(), 'FULL_BODY', AHORA);
		const sustituto = ejercicioBase({ id: 'ej-sust', reps_iniciales: 6 });
		const estados = [estadoBase({ ejercicio_id: 'ej-sust', reps_objetivo: 12 })];
		const s1 = aplicarSustitucion(s0, sustituto, estados, AHORA);
		expect(s1.plan[0].reps_objetivo).toBe(12);
	});
});

describe('bloqueosVencidos (ALG-08)', () => {
	it('devuelve solo los bloqueos con fecha_revision vencida', () => {
		const estados = [
			estadoBase({
				ejercicio_id: 'ej-vencido',
				bloqueado: true,
				fecha_revision: AHORA - DIA_MS,
			}),
			estadoBase({ ejercicio_id: 'ej-hoy', bloqueado: true, fecha_revision: AHORA }),
			estadoBase({
				ejercicio_id: 'ej-futuro',
				bloqueado: true,
				fecha_revision: AHORA + DIA_MS,
			}),
			estadoBase({ ejercicio_id: 'ej-sin-fecha', bloqueado: true, fecha_revision: null }),
			estadoBase({ ejercicio_id: 'ej-libre', bloqueado: false, fecha_revision: AHORA - DIA_MS }),
		];
		expect(bloqueosVencidos(estados, AHORA).map((e) => e.ejercicio_id)).toEqual([
			'ej-vencido',
			'ej-hoy',
		]);
	});
});

describe('reactivarEjercicio (ALG-08 opcion a, reintroduccion gradual)', () => {
	it('limpia campos de bloqueo y setea reintroduccion_sesiones_restantes = REINTRO-SESIONES', () => {
		const bloqueado = estadoBase({
			ejercicio_id: 'ej-bloq',
			bloqueado: true,
			razon_bloqueo: 'Dolor en hombros',
			fecha_bloqueo: diasAntes(30),
			fecha_revision: diasAntes(-2),
		});
		const r = reactivarEjercicio(bloqueado);
		expect(r.bloqueado).toBe(false);
		expect(r.razon_bloqueo).toBeNull();
		expect(r.fecha_bloqueo).toBeNull();
		expect(r.fecha_revision).toBeNull();
		expect(r.reintroduccion_sesiones_restantes).toBe(2);
	});

	it('pisa cualquier valor previo de reintroduccion al reactivar (re-dolor)', () => {
		// Si reaparecio dolor durante la reintroduccion, el campo puede
		// haber quedado con un valor residual (1). Al reactivar, vuelve
		// a REINTRO-SESIONES=2, no acumula ni respeta el resto.
		const enReintro = estadoBase({
			ejercicio_id: 'ej-bloq',
			bloqueado: true,
			razon_bloqueo: 'Dolor en codos',
			fecha_bloqueo: diasAntes(15),
			fecha_revision: diasAntes(-2),
			reintroduccion_sesiones_restantes: 1,
		});
		const r = reactivarEjercicio(enReintro);
		expect(r.reintroduccion_sesiones_restantes).toBe(2);
	});

	it('no muta el estado recibido', () => {
		const bloqueado = estadoBase({
			ejercicio_id: 'ej-bloq',
			bloqueado: true,
			razon_bloqueo: 'Dolor en hombros',
			fecha_bloqueo: diasAntes(30),
			fecha_revision: diasAntes(-2),
		});
		const copia = { ...bloqueado };
		reactivarEjercicio(bloqueado);
		expect(bloqueado).toEqual(copia);
	});
});
