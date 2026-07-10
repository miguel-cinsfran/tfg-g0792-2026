// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Temporizador from './Temporizador.svelte';

vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: vi.fn(),
	anunciarAssertive: vi.fn(),
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: vi.fn(),
}));

import { anunciarPolite } from '$lib/a11y/live-region';
import { sonar } from '$lib/sonido/reproducir';

const anunciarPoliteMock = vi.mocked(anunciarPolite);
const sonarMock = vi.mocked(sonar);

describe('Temporizador — hitos de voz', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		anunciarPoliteMock.mockClear();
		sonarMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('descanso de 90s: anuncia hitos de voz en 60, 30 y 10', () => {
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 90, alTerminar },
		});
		flushSync();

		// Avanzar a restantes = 60 (90 - 30 = 60)
		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 1 minuto');

		// Avanzar a restantes = 30 (60 - 30 = 30)
		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 30 segundos');

		// Avanzar a restantes = 10 (30 - 20 = 10)
		vi.advanceTimersByTime(20_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 10 segundos');

		// Finalizar: alTerminar se dispara. Los ultimos 5s (5,4,3,2,1)
		// SI se anuncian, pero NO se anuncia "0 segundos" ni "1 minuto"
		// al pisar 0. El "Siguiente serie" del descanso lo emite el
		// padre, no el componente.
		anunciarPoliteMock.mockClear();
		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(alTerminar).toHaveBeenCalledOnce();
		const mensajes = anunciarPoliteMock.mock.calls.map((c) => c[0]);
		expect(mensajes.some((m: string) => m === 'Quedan 0 segundos')).toBe(false);
	});

	it('descanso de 120s: anuncia hitos en 90, 60, 30 y 10', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 120 },
		});
		flushSync();

		// restantes = 90 (120 - 30 = 90)
		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 1 minuto 30 segundos');

		// restantes = 60 (90 - 30 = 60)
		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 1 minuto');

		// restantes = 30 (60 - 30 = 30)
		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 30 segundos');

		// restantes = 10 (30 - 20 = 10)
		vi.advanceTimersByTime(20_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 10 segundos');
	});

	it('descanso de 30s (<= 60): solo anuncia en 10', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 30 },
		});
		flushSync();

		// Avanzar a restantes = 20: no debe anunciar
		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(anunciarPoliteMock).not.toHaveBeenCalled();

		// restantes = 10 (30 - 20 = 10)
		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 10 segundos');

		// Finalizar: alTerminar se dispara, sin anuncio de voz en 0
		anunciarPoliteMock.mockClear();
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 10, alTerminar },
		});
		flushSync();

		vi.advanceTimersByTime(10_000);
		flushSync();
		expect(alTerminar).toHaveBeenCalledOnce();
		const mensajes = anunciarPoliteMock.mock.calls.map((c) => c[0]);
		expect(mensajes.some((m: string) => m === 'Quedan 0 segundos')).toBe(false);
	});

	it('alAviso legacy se dispara en aviso_segundos', () => {
		const alAviso = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 10, alAviso, aviso_segundos: 3 },
		});
		flushSync();

		// Avanzar a restantes = 3 (10 - 7 = 3)
		vi.advanceTimersByTime(7_000);
		flushSync();
		expect(alAviso).toHaveBeenCalledOnce();
	});
});

describe('Temporizador — ultimos 5 segundos anunciados de a uno', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		anunciarPoliteMock.mockClear();
		sonarMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('descanso de 10s: anuncia 5, 4, 3, 2, 1 de a uno (no se anuncia 10 porque el conteo arranca en 10)', () => {
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 10, alTerminar, reloj: false },
		});
		flushSync();
		anunciarPoliteMock.mockClear();

		// Con segundos=10, el conteo arranca en 10; el primer tick
		// decrementa a 9, y la regla del componente chequea hitos
		// contra el nuevo valor. Por lo tanto "Quedan 10 segundos" no
		// se anuncia (arrancamos en 10, no "quedan 10"). Lo que SI se
		// anuncia es la cuenta final de a uno.
		vi.advanceTimersByTime(5_000);
		flushSync();
		const cinco = anunciarPoliteMock.mock.calls.filter(
			(c) => c[0] === 'Quedan 5 segundos',
		);
		expect(cinco.length).toBe(1);

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 4 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 3 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 2 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 1 segundo');
	});

	it('descanso de 30s: cada anuncio de los ultimos 5s aparece UNA sola vez (sin duplicar)', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 30, reloj: false },
		});
		flushSync();
		anunciarPoliteMock.mockClear();

		// Llevar de 30 a 0: emite hitos en 10, 5, 4, 3, 2, 1.
		// Cada uno debe aparecer exactamente UNA vez.
		vi.advanceTimersByTime(30_000);
		flushSync();

		const llamadas = anunciarPoliteMock.mock.calls.map((c) => c[0]);
		for (const n of [10, 5, 4, 3, 2, 1]) {
			const texto = n === 1 ? 'Quedan 1 segundo' : `Quedan ${n} segundos`;
			expect(llamadas.filter((m) => m === texto).length).toBe(1);
		}
	});

	it('descanso de 6s: anuncia 5, 4, 3, 2, 1 (no hitos de 30/10 que no aplican)', () => {
		// segundos > 5 para que 5 sea un hito (la regla es n < segundos).
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 6, reloj: false },
		});
		flushSync();
		anunciarPoliteMock.mockClear();

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 5 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 4 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 3 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 2 segundos');

		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 1 segundo');
	});
});

describe('Temporizador — cadencia del reloj', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.useFakeTimers();
		anunciarPoliteMock.mockClear();
		sonarMock.mockClear();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		vi.useRealTimers();
	});

	it('default: descanso 1/seg (cadenciaRelojMs=1000 por default)', () => {
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 5, alTerminar },
		});
		flushSync();

		// 4 segundos: 4 pulsos (tic, tac, tic, tac)
		vi.advanceTimersByTime(4_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(4);
	});

	it('sostener: cadenciaRelojMs=500 duplica la cantidad de pulsos', () => {
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 5, alTerminar, cadenciaRelojMs: 500 },
		});
		flushSync();

		// 2 segundos a 500ms = 4 pulsos (mismo conteo del descanso en 2s
		// de Reloj seria 2 pulsos). Documenta el contrato: con 500ms el
		// reloj pulsa el doble de rapido que con 1000ms.
		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(4);
	});

	it('sostener con cadenciaRelojMs=500 y conteo por segundo: anuncios y decrementos siguen a 1 Hz', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 4, cadenciaRelojMs: 500 },
		});
		flushSync();
		anunciarPoliteMock.mockClear();

		// Tras 1 segundo: anuncio de "Quedan 3 segundos" (decremento a 1Hz,
		// no a 2Hz). El reloj emite 2 pulsos pero el conteo y los hitos
		// son por segundo.
		vi.advanceTimersByTime(1_000);
		flushSync();
		expect(anunciarPoliteMock).toHaveBeenCalledWith('Quedan 3 segundos');
	});

	it('pulso se silencia al llegar a 0 (el silencio enmarca el fin)', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 3 },
		});
		flushSync();
		sonarMock.mockClear();

		// Con segundos=3: el conteo decrementa a 2, 1, 0. En cada paso
		// el conteo corre antes que el reloj (orden de creacion de los
		// setInterval), asi que en t=3000 el conteo ya puso
		// `corriendo=false` cuando el reloj evalua el tick. El pulso
		// suena 2 veces (t=1000 con restantes=2, t=2000 con
		// restantes=1) y se silencia a partir de t=3000.
		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(5_000);
		flushSync();
		expect(sonarMock).toHaveBeenCalledTimes(2);
	});

	it('reloj=false: no emite sonido ni en default ni con cadencia custom', () => {
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 5, reloj: false, cadenciaRelojMs: 500 },
		});
		flushSync();

		vi.advanceTimersByTime(3_000);
		flushSync();
		expect(sonarMock).not.toHaveBeenCalled();
	});

	it('alTerminar se sigue disparando al llegar a 0 aunque el reloj tenga cadencia custom', () => {
		const alTerminar = vi.fn();
		instancia = mount(Temporizador, {
			target: document.body,
			props: { segundos: 3, alTerminar, cadenciaRelojMs: 500 },
		});
		flushSync();

		vi.advanceTimersByTime(3_000);
		flushSync();
		expect(alTerminar).toHaveBeenCalledOnce();
	});
});
