import { describe, it, expect } from 'vitest';
import { progresar, retroceder } from './progresion';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';

describe('progresar / retroceder (ALG-09)', () => {
	it('sin progresion_id es el extremo de la cadena', () => {
		expect(progresar(ejercicioBase({ progresion_id: null }), [], 'hipertrofia')).toEqual({
			tipo: 'extremo',
		});
	});

	it('con destino valido devuelve la variante y el estado nuevo', () => {
		const destino = ejercicioBase({ id: 'ej-dificil', reps_iniciales: 5 });
		const origen = ejercicioBase({ id: 'ej-facil', progresion_id: 'ej-dificil' });
		const r = progresar(origen, [origen, destino], 'hipertrofia');
		expect(r.tipo).toBe('cambio');
		if (r.tipo === 'cambio') {
			expect(r.destino.id).toBe('ej-dificil');
			expect(r.estado_nuevo).toEqual({
				ejercicio_id: 'ej-dificil',
				series_objetivo: 3, // OBJ-HIPER-SERIES-POR-EJERCICIO real
				reps_objetivo: 5,
				bloqueado: false,
				razon_bloqueo: null,
				fecha_bloqueo: null,
				fecha_revision: null,
				fecha_ultimo_uso: null,
			});
		}
	});

	it('series_objetivo sale del objetivo del perfil (fuerza = 4)', () => {
		const destino = ejercicioBase({ id: 'ej-dificil' });
		const origen = ejercicioBase({ id: 'ej-facil', progresion_id: 'ej-dificil' });
		const r = progresar(origen, [origen, destino], 'fuerza');
		if (r.tipo === 'cambio') expect(r.estado_nuevo.series_objetivo).toBe(4);
		expect(r.tipo).toBe('cambio');
	});

	it('una referencia colgada cuenta como extremo de facto', () => {
		const origen = ejercicioBase({ id: 'ej-facil', progresion_id: 'ej-no-existe' });
		expect(progresar(origen, [origen], 'hipertrofia')).toEqual({ tipo: 'extremo' });
	});

	it('retroceder funciona en espejo con regresion_id', () => {
		const facil = ejercicioBase({ id: 'ej-mas-facil', reps_iniciales: 15 });
		const origen = ejercicioBase({ id: 'ej-actual', regresion_id: 'ej-mas-facil' });
		const r = retroceder(origen, [origen, facil], 'hipertrofia');
		expect(r.tipo).toBe('cambio');
		if (r.tipo === 'cambio') expect(r.destino.id).toBe('ej-mas-facil');
		expect(retroceder(ejercicioBase({ regresion_id: null }), [], 'hipertrofia')).toEqual({
			tipo: 'extremo',
		});
	});
});
