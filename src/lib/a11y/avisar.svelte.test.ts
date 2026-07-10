// @vitest-environment jsdom
// Tests del modulo `avisar`. Cubre: 'exito' usa anunciarPolite,
// 'error' usa anunciarAssertive, cada llamada empuja al store visible
// con id incremental (un aviso nuevo reemplaza al anterior), mensaje
// vacio se ignora, limpiarAvisoVisible vacia el store. Se mockea
// live-region (mismo patron que ImportarRespaldo).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const anunciarPoliteMock = vi.fn();
const anunciarAssertiveMock = vi.fn();

vi.mock('./live-region', () => ({
	anunciarPolite: (...args: unknown[]) => anunciarPoliteMock(...args),
	anunciarAssertive: (...args: unknown[]) => anunciarAssertiveMock(...args)
}));

import {
	avisar,
	obtenerAvisoVisible,
	limpiarAvisoVisible,
	resetearAvisoVisible
} from './avisar.svelte';

beforeEach(() => {
	anunciarPoliteMock.mockReset();
	anunciarAssertiveMock.mockReset();
	resetearAvisoVisible();
});

describe('avisar', () => {
	it('tipo exito: llama anunciarPolite y empuja al store', () => {
		avisar('Sonidos activados', 'exito');

		expect(anunciarPoliteMock).toHaveBeenCalledWith('Sonidos activados');
		expect(anunciarAssertiveMock).not.toHaveBeenCalled();

		const a = obtenerAvisoVisible();
		expect(a).not.toBeNull();
		expect(a?.mensaje).toBe('Sonidos activados');
		expect(a?.tipo).toBe('exito');
		expect(typeof a?.id).toBe('number');
	});

	it('tipo error: llama anunciarAssertive y empuja al store', () => {
		avisar('No se pudo importar', 'error');

		expect(anunciarAssertiveMock).toHaveBeenCalledWith('No se pudo importar');
		expect(anunciarPoliteMock).not.toHaveBeenCalled();

		const a = obtenerAvisoVisible();
		expect(a?.tipo).toBe('error');
	});

	it('default del tipo es exito (compatibilidad con la firma simple)', () => {
		avisar('Listo');
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Listo');
		expect(anunciarAssertiveMock).not.toHaveBeenCalled();
	});

	it('un aviso nuevo reemplaza al anterior y cambia el id', () => {
		avisar('Primero', 'exito');
		const id1 = obtenerAvisoVisible()?.id;
		expect(id1).toBeTypeOf('number');

		avisar('Segundo', 'exito');
		const a = obtenerAvisoVisible();
		expect(a?.mensaje).toBe('Segundo');
		expect(a?.id).not.toBe(id1);
		expect(typeof a?.id).toBe('number');
	});

	it('mensaje vacio se ignora: no anuncia ni empuja', () => {
		avisar('', 'exito');
		expect(anunciarPoliteMock).not.toHaveBeenCalled();
		expect(anunciarAssertiveMock).not.toHaveBeenCalled();
		expect(obtenerAvisoVisible()).toBeNull();
	});
});

describe('limpiarAvisoVisible', () => {
	it('vacia el store visible pero NO toca la region aria-live', () => {
		avisar('Algo', 'exito');
		expect(obtenerAvisoVisible()).not.toBeNull();

		limpiarAvisoVisible();
		expect(obtenerAvisoVisible()).toBeNull();
		// La region aria-live tiene su propio ciclo (LIMPIEZA_MS). El
		// limpiar del canal visible no debe disparar un anuncio nuevo.
		expect(anunciarPoliteMock).toHaveBeenCalledTimes(1);
	});
});

describe('resetearAvisoVisible (solo tests)', () => {
	it('deja el modulo en estado inicial', () => {
		avisar('Algo', 'error');
		resetearAvisoVisible();
		expect(obtenerAvisoVisible()).toBeNull();
		// Tras reset, el siguiente avisar empieza la cuenta de id de 0.
		avisar('Nuevo', 'exito');
		const id1 = obtenerAvisoVisible()?.id;
		avisar('Otro', 'exito');
		const id2 = obtenerAvisoVisible()?.id;
		expect(id2).toBe((id1 ?? 0) + 1);
	});
});
