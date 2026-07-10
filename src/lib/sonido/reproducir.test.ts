// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	sonar,
	sonidosActivados,
	establecerSonidos,
	precargar,
	volumenEfectos,
	establecerVolumenEfectos
} from './reproducir';

beforeEach(() => {
	localStorage.clear();
});

describe('ajuste de sonidos', () => {
	it('activados por defecto', () => {
		expect(sonidosActivados()).toBe(true);
	});

	it('apagar y prender persiste en localStorage', () => {
		establecerSonidos(false);
		expect(sonidosActivados()).toBe(false);
		establecerSonidos(true);
		expect(sonidosActivados()).toBe(true);
	});
});

describe('volumen de efectos', () => {
	it('default 1 sin storage', () => {
		expect(volumenEfectos()).toBe(1);
	});

	it('lee un valor persistido', () => {
		establecerVolumenEfectos(0.42);
		expect(volumenEfectos()).toBeCloseTo(0.42, 5);
	});

	it('clampa fuera de rango al persistir y al leer', () => {
		establecerVolumenEfectos(-1);
		expect(volumenEfectos()).toBe(0);
		establecerVolumenEfectos(2);
		expect(volumenEfectos()).toBe(1);
	});

	it('clampa basura persistida por una version vieja', () => {
		localStorage.setItem('volumen-efectos', 'no-es-un-numero');
		expect(volumenEfectos()).toBe(1);
		localStorage.setItem('volumen-efectos', '5');
		expect(volumenEfectos()).toBe(1);
		localStorage.setItem('volumen-efectos', '-0.5');
		expect(volumenEfectos()).toBe(0);
	});

	it('establecerVolumenEfectos(0) no es lo mismo que sonidos desactivados', () => {
		// Volumen 0 + on: el modulo sigue intentando reproducir a
		// volumen cero (contrato: on/off es el interruptor maestro;
		// el volumen es solo el nivel).
		establecerSonidos(true);
		establecerVolumenEfectos(0);
		expect(sonidosActivados()).toBe(true);
		expect(volumenEfectos()).toBe(0);
	});
});

describe('sonar', () => {
	it('no lanza sin archivo de audio (contrato no-op)', () => {
		expect(() => sonar('inicio-app')).not.toThrow();
	});

	it('no lanza con sonidos desactivados', () => {
		establecerSonidos(false);
		expect(() => sonar('cambio-pestania')).not.toThrow();
	});
});

describe('sonar — eventos del reloj tic-tac', () => {
	it(`sonar('tic') no lanza (contrato no-op)`, () => {
		expect(() => sonar('tic')).not.toThrow();
	});

	it(`sonar('tac') no lanza (contrato no-op)`, () => {
		expect(() => sonar('tac')).not.toThrow();
	});

	it(`sonar('tic') y sonar('tac') no lanzan con sonidos desactivados`, () => {
		establecerSonidos(false);
		expect(() => sonar('tic')).not.toThrow();
		expect(() => sonar('tac')).not.toThrow();
	});

	it(`sonar('tic') y sonar('tac') son eventos distintos y se pueden llamar en secuencia sin error`, () => {
		expect(() => {
			sonar('tic');
			sonar('tac');
			sonar('tic');
		}).not.toThrow();
	});
});

describe('sonar — asigna el volumen antes de reproducir', () => {
	// El modulo cachea un Audio por evento. Cada test usa un evento
	// distinto (y no usado por el resto del archivo) para que el spy
	// capture un Audio recien creado y no uno cacheado de un test previo.

	it('audio.volume refleja volumenEfectos() en el play', () => {
		establecerVolumenEfectos(0.37);
		const original = globalThis.Audio;
		let volumenVisto: number | null = null;
		class AudioMock {
			preload = '';
			currentTime = 0;
			volume = 0;
			play = vi.fn(() => {
				volumenVisto = this.volume;
				return Promise.resolve();
			});
			addEventListener = vi.fn();
			load = vi.fn();
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).Audio = AudioMock;
		try {
			// 'sesion-completada' no aparece en otros tests de este archivo:
			// el cache lo crea de cero y captura el spy de play.
			sonar('sesion-completada');
			expect(volumenVisto).toBeCloseTo(0.37, 5);
		} finally {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(globalThis as any).Audio = original;
		}
	});

	it('un cambio de volumen aplica al proximo disparo', () => {
		const original = globalThis.Audio;
		const volumenesVistos: number[] = [];
		class AudioMock {
			preload = '';
			currentTime = 0;
			volume = 0;
			play = vi.fn(() => {
				volumenesVistos.push(this.volume);
				return Promise.resolve();
			});
			addEventListener = vi.fn();
			load = vi.fn();
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).Audio = AudioMock;
		try {
			// 'inicio-serie' no aparece en otros tests de este archivo.
			establecerVolumenEfectos(0.5);
			sonar('inicio-serie');
			establecerVolumenEfectos(0.2);
			sonar('inicio-serie');
			expect(volumenesVistos[0]).toBeCloseTo(0.5, 5);
			expect(volumenesVistos[1]).toBeCloseTo(0.2, 5);
		} finally {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(globalThis as any).Audio = original;
		}
	});
});

describe('eventos nuevos del tipo EventoSonido', () => {
	// 'seleccion', 'papelera' y 're-evaluar' deben compilar como
	// EventoSonido y sonar() no debe lanzar al dispararlos (los .mp3
	// llegaran despues; mientras tanto, no-op silencioso).
	it('seleccion / papelera / re-evaluar son disparables sin lanzar', () => {
		expect(() => sonar('seleccion')).not.toThrow();
		expect(() => sonar('papelera')).not.toThrow();
		expect(() => sonar('re-evaluar')).not.toThrow();
	});

	it('los tres nuevos son precargables sin lanzar', () => {
		expect(() => precargar('seleccion')).not.toThrow();
		expect(() => precargar('papelera')).not.toThrow();
		expect(() => precargar('re-evaluar')).not.toThrow();
	});
});

describe('precargar', () => {
	// El fin-descanso no suena porque es la primera reproduccion de un
	// Audio "frio" en la WebView. precargar() debe
	// crear el Audio y pedir la carga sin reproducir, para que cuando
	// termine el descanso (segundos despues) ya este caliente.

	it('no lanza sin archivo de audio (contrato no-op)', () => {
		expect(() => precargar('fin-descanso')).not.toThrow();
	});

	it('no lanza con sonidos desactivados', () => {
		establecerSonidos(false);
		expect(() => precargar('fin-descanso')).not.toThrow();
	});

	it('llama a Audio() y a load() del elemento cacheado', () => {
		const loadSpy = vi.fn();
		// Forzamos al spy: el modulo cachea un Audio por evento. Al
		// pedir precargar de un evento NUEVO (no tocado por tests previos),
		// debe crear el Audio y llamar a load().
		const original = globalThis.Audio;
		class AudioMock {
			preload = '';
			currentTime = 0;
			play = vi.fn(() => Promise.resolve());
			addEventListener = vi.fn();
			load = loadSpy;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as any).Audio = AudioMock;
		try {
			// 'logro' no aparece en otros tests de este archivo: el cache
			// lo crea de cero y debe llamar a .load() como parte de la
			// precarga.
			precargar('logro');
			expect(loadSpy).toHaveBeenCalled();
		} finally {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(globalThis as any).Audio = original;
		}
	});
});
