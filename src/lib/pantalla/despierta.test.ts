// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const keepAwakeMock = vi.fn();
const allowSleepMock = vi.fn();

vi.mock('@capacitor-community/keep-awake', () => ({
	KeepAwake: {
		keepAwake: (...args: unknown[]) => keepAwakeMock(...args),
		allowSleep: (...args: unknown[]) => allowSleepMock(...args),
	},
}));

import {
	pantallaEncendidaActivada,
	establecerPantallaEncendida,
	aplicarAlEntrarSesion,
	aplicarAlSalirSesion,
	transicionSesion,
} from './despierta';

describe('pantalla encendida', () => {
	beforeEach(() => {
		localStorage.clear();
		keepAwakeMock.mockReset().mockResolvedValue(undefined);
		allowSleepMock.mockReset().mockResolvedValue(undefined);
	});

	it('activada por defecto: sin clave guardada viene encendida', () => {
		expect(pantallaEncendidaActivada()).toBe(true);
	});

	it('la clave 0 apaga y manda sobre el defecto', () => {
		localStorage.setItem('pantalla-encendida', '0');
		expect(pantallaEncendidaActivada()).toBe(false);
	});

	it('establecer persiste sin llamar al plugin: el efecto vive en /sesion', () => {
		establecerPantallaEncendida(false);
		expect(pantallaEncendidaActivada()).toBe(false);
		expect(keepAwakeMock).not.toHaveBeenCalled();
		expect(allowSleepMock).not.toHaveBeenCalled();

		establecerPantallaEncendida(true);
		expect(pantallaEncendidaActivada()).toBe(true);
		expect(keepAwakeMock).not.toHaveBeenCalled();
	});

	it('al entrar a /sesion sin clave pide keepAwake', async () => {
		await aplicarAlEntrarSesion();
		expect(keepAwakeMock).toHaveBeenCalledOnce();
		expect(allowSleepMock).not.toHaveBeenCalled();
	});

	it('al entrar a /sesion con 0 guardado no pide keepAwake', async () => {
		localStorage.setItem('pantalla-encendida', '0');
		await aplicarAlEntrarSesion();
		expect(keepAwakeMock).not.toHaveBeenCalled();
	});

	it('al salir de /sesion pide allowSleep', async () => {
		await aplicarAlSalirSesion();
		expect(allowSleepMock).toHaveBeenCalledOnce();
		expect(keepAwakeMock).not.toHaveBeenCalled();
	});

	it('si el plugin falla (no soportado) no lanza', async () => {
		keepAwakeMock.mockRejectedValueOnce(new Error('not supported'));
		allowSleepMock.mockRejectedValueOnce(new Error('not supported'));
		await expect(aplicarAlEntrarSesion()).resolves.toBeUndefined();
		await expect(aplicarAlSalirSesion()).resolves.toBeUndefined();
	});

	it('transicionSesion distingue entrar, salir y nada', () => {
		expect(transicionSesion(null, '/sesion')).toBe('entrar');
		expect(transicionSesion('/', '/sesion')).toBe('entrar');
		expect(transicionSesion('/perfil', '/sesion')).toBe('entrar');
		expect(transicionSesion('/sesion', '/perfil')).toBe('salir');
		expect(transicionSesion('/sesion', '/')).toBe('salir');
		expect(transicionSesion('/', '/perfil')).toBe('nada');
		expect(transicionSesion('/sesion', '/sesion')).toBe('nada');
		expect(transicionSesion(null, '/')).toBe('nada');
	});
});
