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
	aplicarPreferenciaPantalla,
} from './despierta';

describe('pantalla encendida', () => {
	beforeEach(() => {
		localStorage.clear();
		keepAwakeMock.mockReset().mockResolvedValue(undefined);
		allowSleepMock.mockReset().mockResolvedValue(undefined);
	});

	it('apagada por defecto (gastar bateria es opt-in)', () => {
		expect(pantallaEncendidaActivada()).toBe(false);
	});

	it('activar persiste la preferencia y pide keepAwake', async () => {
		await establecerPantallaEncendida(true);
		expect(pantallaEncendidaActivada()).toBe(true);
		expect(keepAwakeMock).toHaveBeenCalledOnce();
		expect(allowSleepMock).not.toHaveBeenCalled();
	});

	it('desactivar persiste y pide allowSleep', async () => {
		await establecerPantallaEncendida(true);
		await establecerPantallaEncendida(false);
		expect(pantallaEncendidaActivada()).toBe(false);
		expect(allowSleepMock).toHaveBeenCalledOnce();
	});

	it('al arrancar re-aplica solo si estaba activada', async () => {
		await aplicarPreferenciaPantalla();
		expect(keepAwakeMock).not.toHaveBeenCalled();

		localStorage.setItem('pantalla-encendida', '1');
		await aplicarPreferenciaPantalla();
		expect(keepAwakeMock).toHaveBeenCalledOnce();
	});

	it('si el plugin falla (no soportado) no lanza', async () => {
		keepAwakeMock.mockRejectedValueOnce(new Error('not supported'));
		await expect(establecerPantallaEncendida(true)).resolves.toBeUndefined();
		expect(pantallaEncendidaActivada()).toBe(true);
	});
});
