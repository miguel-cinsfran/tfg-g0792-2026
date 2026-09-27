// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Cronometro from './Cronometro.svelte';

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: vi.fn(),
}));

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: vi.fn(),
	anunciarAssertive: vi.fn(),
}));

import { sonar } from '$lib/sonido/reproducir';
import { anunciarPolite } from '$lib/a11y/live-region';

const sonarMock = vi.mocked(sonar);
const anunciarPoliteMock = vi.mocked(anunciarPolite);

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
		anunciarPoliteMock.mockClear();
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
		// 5 s de cuenta atras para ponerse en posicion; el conteo nace
		// en el flush posterior, asi que se avanza en dos fases.
		vi.advanceTimersByTime(5_000);
		flushSync();
		vi.advanceTimersByTime(23_000);
		flushSync();
		expect(document.body.textContent).toContain('23 segundos');

		botonPorTexto('Detener').click();
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
		flushSync();
		vi.advanceTimersByTime(5_000);
		botonPorTexto('Detener').click();
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(5_000);
		flushSync();
		vi.advanceTimersByTime(3_000);
		flushSync();
		expect(document.body.textContent).toContain('3 segundos');

		botonPorTexto('Detener').click();
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
		vi.advanceTimersByTime(5_000);
		flushSync();
		vi.advanceTimersByTime(65_000);
		flushSync();
		expect(document.body.textContent).toContain('1 minuto 5 segundos');
	});
});

describe('Cronometro - cuenta atras de 5 segundos', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		sonarMock.mockClear();
		anunciarPoliteMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('a los 4,9 s el tiempo sigue en 0 y el boton dice Cancelar; a los 5 s arranca', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(4_900);
		flushSync();
		expect(document.body.textContent).toContain('0 segundos');
		expect(document.body.textContent).not.toContain('1 segundo');
		botonPorTexto('Cancelar');
		expect(alParar).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		flushSync();
		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(document.body.textContent).toContain('2 segundos');
		botonPorTexto('Detener');
	});

	it('la cuenta atras anuncia cada numero por la region polite y al cero anuncia Ya', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('5');

		vi.advanceTimersByTime(4_000);
		flushSync();
		for (const n of ['4', '3', '2', '1']) {
			expect(anunciarPoliteMock).toHaveBeenCalledWith(n);
		}
		expect(anunciarPoliteMock).not.toHaveBeenCalledWith('Ya');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Ya');
	});

	it('Cancelar durante la cuenta vuelve al estado inicial sin registrar nada', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(2_000);
		flushSync();

		botonPorTexto('Cancelar').click();
		flushSync();
		botonPorTexto('Empezar a contar');
		expect(document.body.textContent).toContain('0 segundos');

		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(document.body.textContent).toContain('0 segundos');
		expect(alParar).not.toHaveBeenCalled();
	});

	it('tras cancelar, volver a empezar hace la cuenta completa de nuevo', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, { target: document.body, props: { alParar } });
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(2_000);
		flushSync();
		botonPorTexto('Cancelar').click();
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();
		vi.advanceTimersByTime(4_900);
		flushSync();
		expect(document.body.textContent).toContain('0 segundos');
		vi.advanceTimersByTime(100);
		flushSync();
		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(document.body.textContent).toContain('1 segundo');
		expect(alParar).not.toHaveBeenCalled();
	});
});

describe('Cronometro - tic-tac del reloj', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		sonarMock.mockClear();
		anunciarPoliteMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('default reloj=false: en marcha no hay tic/tac, solo la cuenta atras inicial', () => {
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		// Pasar la cuenta atras (5 sonidos cortos) y entrar en marcha.
		vi.advanceTimersByTime(5_000);
		flushSync();
		sonarMock.mockClear();

		vi.advanceTimersByTime(4_000);
		flushSync();

		// Con reloj=false, en marcha no hay pulsos: el Boton ya sono en
		// el click (anterior al clear) y el conteo no suena.
		expect(sonarMock).not.toHaveBeenCalled();
	});

	it('reloj activo a 1 Hz: seleccion del boton + un pulso por segundo alternando tic/tac', () => {
		// El pulso corre en su PROPIO setInterval, desacoplado del
		// conteo. Tras la cuenta atras (limpiada), 4 segundos en marcha
		// emiten 4 pulsos alternados.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(5_000);
		flushSync();
		sonarMock.mockClear();

		vi.advanceTimersByTime(4_000);
		flushSync();

		expect(sonarMock).toHaveBeenCalledTimes(4);
		// El contador propio del pulso siguio corriendo (en silencio)
		// durante la cuenta atras: 5 ticks lo dejan impar y el primer
		// pulso en marcha es 'tac'. Lo que importa es la alternancia.
		const llamadas = sonarMock.mock.calls.map((c) => c[0]);
		expect(llamadas).toEqual(['tac', 'tic', 'tac', 'tic']);
	});

	it('cadenciaRelojMs=500 duplica la cantidad de pulsos (sostener, 2/seg)', () => {
		// Plancha de evaluacion: cadencia 500 ms = 2 pulsos por
		// segundo. Tras la cuenta atras, en 2 segundos emite 4 pulsos.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true, cadenciaRelojMs: 500 },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(5_000);
		flushSync();
		sonarMock.mockClear();

		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(4);

		// La alternancia tic/tac sigue siendo valida (la paridad la lleva
		// el contador propio del pulso, no los segundos).
		const llamadas = sonarMock.mock.calls.map((c) => c[0]);
		expect(llamadas).toEqual(['tic', 'tac', 'tic', 'tac']);
	});

	it('con cadenciaRelojMs=500, el conteo y los anuncios siguen a 1 Hz', () => {
		// Documenta el contrato normado: el conteo visible y los anuncios
		// cada 5 s son por segundo aunque el reloj pulse al doble. En 1
		// segundo de marcha, segundos pasa de 0 a 1 (no a 2); a los 5 s,
		// un solo anuncio de voz.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true, cadenciaRelojMs: 500 },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(5_000);
		flushSync();
		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(document.body.textContent).toContain('1 segundo');

		vi.advanceTimersByTime(4_000);
		flushSync();
		expect(document.body.textContent).toContain('5 segundos');
	});

	it('el pulso se silencia al parar (alParar), sin sonido fantasma', () => {
		// Al bajar `corriendo` el pulso deja de sonar en el
		// siguiente tick. Mismo doble seguro que el Temporizador.
		const alParar = vi.fn();
		instancia = mount(Cronometro, {
			target: document.body,
			props: { alParar, reloj: true },
		});
		flushSync();

		botonPorTexto('Empezar a contar').click();
		flushSync();

		vi.advanceTimersByTime(5_000);
		flushSync();
		vi.advanceTimersByTime(3_000);
		flushSync();
		// 'seleccion' (1) + cuenta atras (5) + inicio-serie (1) + 3 s en
		// marcha (3) = 10. A t=5 el pulso del reloj aun no ve el arranque
		// (su callback corre antes que el de la cuenta), asi que no suena.
		expect(sonarMock).toHaveBeenCalledTimes(10);

		botonPorTexto('Detener').click();
		flushSync();
		sonarMock.mockClear();

		vi.advanceTimersByTime(5_000);
		flushSync();
		expect(sonarMock).not.toHaveBeenCalled();
	});
});
