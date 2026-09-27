// @vitest-environment jsdom
// Tests del componente AvisoVisible. Cubre:
// - No renderiza nada cuando el store esta vacio.
// - Renderiza el mensaje cuando hay un aviso.
// - El contenedor va aria-hidden="true" (canal visual, NO duplica voz).
// - Aplica el estilo de exito vs error segun el tipo.
// - El temporizador limpia el aviso al expirar (fake timers).
// - Un aviso nuevo reemplaza al anterior y reinicia el temporizador.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AvisoVisible from './AvisoVisible.svelte';
import {
	avisar,
	limpiarAvisoVisible,
	resetearAvisoVisible
} from './avisar.svelte';

vi.mock('./live-region', () => ({
	anunciarPolite: vi.fn(),
	anunciarAssertive: vi.fn()
}));

describe('AvisoVisible', () => {
	let instancia: ReturnType<typeof mount> | undefined;

	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '';
		resetearAvisoVisible();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = undefined;
		vi.useRealTimers();
	});

	it('no renderiza nada cuando el store esta vacio', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).toBeNull();
	});

	it('muestra el mensaje cuando hay un aviso', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Sonidos activados', 'exito');
		flushSync();
		const aviso = document.body.querySelector('.aviso-visible');
		expect(aviso).not.toBeNull();
		expect(aviso?.textContent).toContain('Sonidos activados');
	});

	it('el contenedor va aria-hidden=true (no duplica la voz del lector)', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Algo', 'exito');
		flushSync();
		const aviso = document.body.querySelector('.aviso-visible');
		expect(aviso?.getAttribute('aria-hidden')).toBe('true');
	});

	it('aplica clase de exito y muestra el icono de cheque', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Listo', 'exito');
		flushSync();
		const aviso = document.body.querySelector('.aviso-visible');
		expect(aviso?.classList.contains('aviso-visible--exito')).toBe(true);
		expect(aviso?.classList.contains('aviso-visible--error')).toBe(false);
		// CirculoCheque de Phosphor: un solo <path> macizo
		expect(aviso?.querySelectorAll('svg path').length).toBe(1);
	});

	it('aplica clase de error y muestra el icono de alerta', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('No se pudo importar', 'error');
		flushSync();
		const aviso = document.body.querySelector('.aviso-visible');
		expect(aviso?.classList.contains('aviso-visible--error')).toBe(true);
		expect(aviso?.classList.contains('aviso-visible--exito')).toBe(false);
		// Alerta (warning) de Phosphor: un solo <path>
		expect(aviso?.querySelectorAll('svg path').length).toBe(1);
	});

	it('se vacia al expirar el temporizador de exito (4s)', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Listo', 'exito');
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		vi.advanceTimersByTime(3_999);
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		vi.advanceTimersByTime(1);
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).toBeNull();
	});

	it('se vacia al expirar el temporizador de error (8s)', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Revento', 'error');
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		vi.advanceTimersByTime(7_999);
		flushSync();
		// A 7.999s todavia debe estar
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		vi.advanceTimersByTime(1);
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).toBeNull();
	});

	it('un aviso nuevo reemplaza al anterior (mensaje y temporizador)', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Primero', 'exito');
		flushSync();

		// Pasaron 2s del primer aviso; el segundo debe reiniciar a 4s.
		vi.advanceTimersByTime(2_000);
		avisar('Segundo', 'exito');
		flushSync();

		const aviso = document.body.querySelector('.aviso-visible');
		expect(aviso?.textContent).toContain('Segundo');

		// A los 2s del segundo aviso, el primero ya estaria cerrado
		// (van 4s), pero el nuevo debe seguir.
		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		// Y al cerrar el ciclo de 4s del segundo, se vacia.
		vi.advanceTimersByTime(2_000);
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).toBeNull();
	});

	it('limpiarAvisoVisible directo vacia la pantalla', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Algo', 'exito');
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).not.toBeNull();

		limpiarAvisoVisible();
		flushSync();
		expect(document.body.querySelector('.aviso-visible')).toBeNull();
	});

	it('flota abajo sobre la barra que haya, sin fijarse arriba', () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('Algo', 'exito');
		flushSync();
		const aviso = document.body.querySelector('.aviso-visible') as HTMLElement;
		expect(aviso.className).not.toMatch(/top-\[/);
		expect(aviso.getAttribute('style') ?? '').toContain('bottom');
	});
});
