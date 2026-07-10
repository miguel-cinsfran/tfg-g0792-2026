// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Cronometro from './Cronometro.svelte';

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: vi.fn(),
}));

import { sonar } from '$lib/sonido/reproducir';

const sonarMock = vi.mocked(sonar);

function botonPorTexto(texto: string): HTMLButtonElement {
	const boton = [...document.body.querySelectorAll('button')].find((b) =>
		b.textContent?.includes(texto),
	);
	if (!boton) throw new Error(`No hay boton "${texto}"`);
	return boton;
}

describe('Cronometro', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		sonarMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('cuenta hacia arriba al empezar y entrega los segundos al parar', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(23_000);
		flushSync();
		expect(document.body.textContent).toContain('23 segundos');

		botonPorTexto('Parar').click();
		flushSync();
		expect(alParar).toHaveBeenCalledWith(23);
	});

	it('al volver a empezar arranca de cero', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(5_000);
		botonPorTexto('Parar').click();
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(3_000);
		flushSync();
		expect(document.body.textContent).toContain('3 segundos');

		botonPorTexto('Parar').click();
		flushSync();
		expect(alParar).toHaveBeenLastCalledWith(3);
	});

	it('no cuenta si no se empezo', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();
		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(document.body.textContent).toContain('0 segundos');
		expect(alParar).not.toHaveBeenCalled();
	});

	it('muestra formato humano a los 65 segundos', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(65_000);
		flushSync();
		expect(document.body.textContent).toContain('1 minuto 5 segundos');
	});
});

describe('Cronometro — tic-tac del reloj', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		sonarMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('default reloj=false solo emite seleccion del boton, no tic/tac', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(4_000);
		flushSync();

		// El Boton emite 'seleccion' al hacer click. Como reloj=false,
		// no hay tic/tac — solo una llamada total.
		expect(sonarMock).toHaveBeenCalledTimes(1);
		expect(sonarMock).toHaveBeenCalledWith('seleccion');
	});

	it('reloj activo a 1 Hz: seleccion del boton + un pulso por segundo alternando tic/tac', () => {
		// El pulso corre en su PROPIO setInterval, desacoplado del
		// conteo. Con cadenciaRelojMs=1000 (default), 4 segundos emiten
		// 4 pulsos alternados. El Boton agrega 'seleccion' al click.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(4_000);
		flushSync();

		expect(sonarMock).toHaveBeenCalledTimes(5);
		const llamadas = sonarMock.mock.calls.map((c) => c[0]);
		expect(llamadas).toEqual(['seleccion', 'tic', 'tac', 'tic', 'tac']);
	});

	it('cadenciaRelojMs=500 duplica la cantidad de pulsos (sostener, 2/seg)', () => {
		// Ronda 6, plancha de evaluacion: cadencia 500 ms = 2 pulsos por
		// segundo. En 2 segundos emite 4 pulsos (mismo conteo audible que
		// el default en 4 segundos). Ronda 7: el Boton agrega
		// 'seleccion' al click.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true, cadenciaRelojMs: 500 },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(5);

		// La alternancia tic/tac sigue siendo valida (la paridad la lleva
		// el contador propio del pulso, no los segundos).
		const llamadas = sonarMock.mock.calls.map((c) => c[0]);
		expect(llamadas).toEqual(['seleccion', 'tic', 'tac', 'tic', 'tac']);
	});

	it('con cadenciaRelojMs=500, el conteo y los anuncios siguen a 1 Hz', () => {
		// Documenta el contrato normado: el conteo visible y los anuncios
		// cada 5 s son por segundo aunque el reloj pulse al doble. En 1
		// segundo, segundos pasa de 0 a 1 (no a 2); a los 5 s, un solo
		// anuncio de voz.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true, cadenciaRelojMs: 500 },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(document.body.textContent).toContain('1 segundo');

		vi.advanceTimersByTime(4_000);
		flushSync();
		expect(document.body.textContent).toContain('5 segundos');
	});

	it('el pulso se silencia al parar (alParar), sin sonido fantasma', () => {
		// Ronda 6: al bajar `corriendo` el pulso deja de sonar en el
		// siguiente tick. Mismo doble seguro que el Temporizador.
		// Ronda 7: el Boton emite 'seleccion' al hacer click.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(3_000);
		flushSync();
		// 'seleccion' del click + tic/tac/tic = 4 llamadas
		expect(sonarMock).toHaveBeenCalledTimes(4);

		botonPorTexto('Parar').click();
		flushSync();
		sonarMock.mockClear();

		vi.advanceTimersByTime(5_000);
		flushSync();
		expect(sonarMock).not.toHaveBeenCalled();
	});
});
