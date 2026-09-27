// @vitest-environment jsdom
//
// En layout.test.ts el doble de $app/navigation devuelve el callback de
// afterNavigate y no lo llama nunca: el cuerpo de RouteAnnouncer (el
// cableado de reaplicarFocoPendiente y el anuncio del titulo) no corria
// en ninguna prueba del repositorio. Aca el doble GUARDA el callback para
// disparar una navegacion a mano y fijar el efecto que la persona percibe.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { enfocarPrincipal, reaplicarFocoPendiente, resetearSupresionAnuncioDeRuta } from './foco';

const estadoMock = vi.hoisted(() => {
	const callbacks = new Set<(nav: unknown) => unknown>();
	return {
		callbacks,
		// afterNavigate registra el callback; dispararNavegacion lo corre.
		afterNavigate: (fn: (nav: unknown) => unknown) => {
			callbacks.add(fn);
		},
		async dispararNavegacion(nav: unknown): Promise<void> {
			await Promise.all([...callbacks].map((fn) => fn(nav)));
		}
	};
});

vi.mock('$app/navigation', () => ({
	afterNavigate: (fn: (nav: unknown) => unknown) => estadoMock.afterNavigate(fn)
}));

import RouteAnnouncer from './RouteAnnouncer.svelte';

let instancia: ReturnType<typeof mount> | null = null;

function navegacion(): { to: { url: URL } } {
	return { to: { url: new URL('https://app.test/sesion') } };
}

function montarAnunciador(): void {
	instancia = mount(RouteAnnouncer, { target: document.body });
	flushSync();
}

function h1EnElDocumento(): HTMLHeadingElement {
	const h1 = document.createElement('h1');
	h1.tabIndex = -1;
	document.body.appendChild(h1);
	return h1;
}

describe('RouteAnnouncer: cableado de reaplicarFocoPendiente', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		document.title = '';
		estadoMock.callbacks.clear();
		vi.useFakeTimers();
		// Drena el pendiente de un test anterior: sin pendiente
		// reaplicarFocoPendiente es inofensivo y devuelve true.
		reaplicarFocoPendiente();
		resetearSupresionAnuncioDeRuta();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = null;
		vi.useRealTimers();
	});

	it('reaplica el foco al h1 que el reset de SvelteKit robo tras la navegacion', async () => {
		const h1 = h1EnElDocumento();
		enfocarPrincipal(h1);
		// El reset de SvelteKit deja el foco en el body. En jsdom un
		// body.focus() no le gana a un elemento enfocado: blur llega al
		// mismo estado posterior al robo.
		h1.blur();
		expect(document.activeElement).toBe(document.body);

		montarAnunciador();

		await estadoMock.dispararNavegacion(navegacion());

		expect(document.activeElement).toBe(h1);
	});

	it('silencia al anunciador de SvelteKit, que no se puede apagar por configuracion', async () => {
		const anunciador = document.createElement('div');
		anunciador.id = 'svelte-announcer';
		document.body.appendChild(anunciador);

		montarAnunciador();

		await estadoMock.dispararNavegacion(navegacion());

		expect(anunciador.getAttribute('aria-hidden')).toBe('true');
	});

	it('sin el anunciador de SvelteKit presente la navegacion funciona igual', async () => {
		document.title = 'Mi pagina de prueba';
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		montarAnunciador();

		await expect(estadoMock.dispararNavegacion(navegacion())).resolves.toBeUndefined();
		vi.advanceTimersByTime(50);

		// El anuncio sigue saliendo por la region propia.
		expect(region.textContent).toBe(document.title);
	});

	it('si el foco no queda, anuncia el titulo por la region polite', async () => {
		document.title = 'Mi pagina de prueba';
		const region = document.createElement('div');
		region.id = 'live-polite';
		document.body.appendChild(region);

		const h1 = h1EnElDocumento();
		enfocarPrincipal(h1);
		h1.blur();
		// La pagina nueva no tiene el h1: reaplicar no puede devolver el
		// foco y sin el anuncio la persona quedaria en silencio.
		h1.remove();

		montarAnunciador();

		await estadoMock.dispararNavegacion(navegacion());
		// La region se escribe con un retardo de 50 ms.
		vi.advanceTimersByTime(50);

		// El anuncio es exactamente el titulo del documento: lo que la
		// persona escucha por la region polite.
		expect(region.textContent).toBe(document.title);
	});
});
