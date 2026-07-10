import { describe, it, expect } from 'vitest';
import { ordenarParaSeleccion } from './seleccion';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';
import { estadoBase } from '../../../tests/fixtures/estado-base';
import { AHORA, DIA_MS } from '../../../tests/fixtures/ahora';

describe('ordenarParaSeleccion', () => {
	it('ordena ascendente por fecha_ultimo_uso', () => {
		const a = ejercicioBase({ id: 'ej-a' });
		const b = ejercicioBase({ id: 'ej-b' });
		const estados = [
			estadoBase({ ejercicio_id: 'ej-a', fecha_ultimo_uso: AHORA }),
			estadoBase({ ejercicio_id: 'ej-b', fecha_ultimo_uso: AHORA - DIA_MS }),
		];
		expect(ordenarParaSeleccion([a, b], estados).map((e) => e.id)).toEqual(['ej-b', 'ej-a']);
	});

	it('null cuenta como mas antiguo que cualquier fecha', () => {
		const usado = ejercicioBase({ id: 'ej-a' });
		const nunca = ejercicioBase({ id: 'ej-z' });
		const estados = [
			estadoBase({ ejercicio_id: 'ej-a', fecha_ultimo_uso: AHORA - 100 * DIA_MS }),
			estadoBase({ ejercicio_id: 'ej-z', fecha_ultimo_uso: null }),
		];
		expect(ordenarParaSeleccion([usado, nunca], estados)[0].id).toBe('ej-z');
	});

	it('sin entrada en estados equivale a nunca usado', () => {
		const usado = ejercicioBase({ id: 'ej-a' });
		const sinEstado = ejercicioBase({ id: 'ej-z' });
		const estados = [estadoBase({ ejercicio_id: 'ej-a', fecha_ultimo_uso: AHORA })];
		expect(ordenarParaSeleccion([usado, sinEstado], estados)[0].id).toBe('ej-z');
	});

	it('desempata por id alfabetico ascendente', () => {
		const b = ejercicioBase({ id: 'ej-b' });
		const a = ejercicioBase({ id: 'ej-a' });
		expect(ordenarParaSeleccion([b, a], []).map((e) => e.id)).toEqual(['ej-a', 'ej-b']);
	});

	it('no muta la lista recibida', () => {
		const b = ejercicioBase({ id: 'ej-b' });
		const a = ejercicioBase({ id: 'ej-a' });
		const entrada = [b, a];
		ordenarParaSeleccion(entrada, []);
		expect(entrada.map((e) => e.id)).toEqual(['ej-b', 'ej-a']);
	});

	it('lista vacia devuelve lista vacia', () => {
		expect(ordenarParaSeleccion([], [])).toEqual([]);
	});
});
