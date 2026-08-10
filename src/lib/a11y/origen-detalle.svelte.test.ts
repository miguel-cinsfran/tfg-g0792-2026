// @vitest-environment jsdom
//
// Store en memoria del origen lista -> detalle (sin persistencia:
// sobrevive a history.back() dentro de la sesion SPA y nada mas).

import { describe, it, expect, beforeEach } from 'vitest';
import {
	registrarOrigenDetalle,
	leerOrigenDetalle,
	limpiarOrigenDetalle,
} from './origen-detalle.svelte';

describe('origen-detalle', () => {
	beforeEach(() => {
		limpiarOrigenDetalle();
	});

	it('comienza sin origen (null)', () => {
		expect(leerOrigenDetalle()).toBeNull();
	});

	it('registrar guarda el id y leer lo devuelve', () => {
		registrarOrigenDetalle('ej-A');
		expect(leerOrigenDetalle()).toBe('ej-A');
	});

	it('un segundo registro reemplaza al primero (no acumula)', () => {
		registrarOrigenDetalle('ej-A');
		registrarOrigenDetalle('ej-B');
		expect(leerOrigenDetalle()).toBe('ej-B');
	});

	it('limpiar deja el origen en null', () => {
		registrarOrigenDetalle('ej-A');
		limpiarOrigenDetalle();
		expect(leerOrigenDetalle()).toBeNull();
	});
});
