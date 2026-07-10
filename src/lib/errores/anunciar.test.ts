// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anunciarError } from './anunciar';
import { mensajePara } from './mensajes';

const { anunciarAssertiveMock, sonarMock } = vi.hoisted(() => ({
	anunciarAssertiveMock: vi.fn(),
	sonarMock: vi.fn(),
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarAssertive: anunciarAssertiveMock,
	anunciarPolite: vi.fn(),
}));

vi.mock('$lib/sonido/reproducir', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/sonido/reproducir')>();
	return {
		...mod,
		sonar: sonarMock,
	};
});

beforeEach(() => {
	anunciarAssertiveMock.mockClear();
	sonarMock.mockClear();
	localStorage.clear();
});

describe('anunciarError', () => {
	it('dispara anunciarAssertive + sonar con sonidos activados', () => {
		anunciarError('ERR-DB-READ');
		expect(anunciarAssertiveMock).toHaveBeenCalledWith(mensajePara('ERR-DB-READ'));
		expect(sonarMock).toHaveBeenCalledWith('error');
	});

	it('no lanza con sonidos desactivados', async () => {
		const { establecerSonidos } = await import('$lib/sonido/reproducir');
		establecerSonidos(false);
		expect(() => anunciarError('ERR-DB-READ')).not.toThrow();
	});

	it('no lanza con code desconocido', () => {
		expect(() => anunciarError('ERR-FAKE-CODE')).not.toThrow();
	});

	it('anuncia antes de sonar (orden)', () => {
		anunciarError('ERR-DB-READ');
		const anunciarOrder = anunciarAssertiveMock.mock.invocationCallOrder[0];
		const sonarOrder = sonarMock.mock.invocationCallOrder[0];
		expect(anunciarOrder).toBeLessThan(sonarOrder);
	});
});
