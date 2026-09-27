// @vitest-environment jsdom
//
// Pantalla /config/acerca: muestra la versión del campo version de
// package.json (la que release.sh mantiene igual al versionName), la
// autoría y que los datos no salen del teléfono.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import PaginaAcerca from './+page.svelte';
import { M } from '$lib/mensajes/ui';
import paquete from '../../../../package.json' with { type: 'json' };

vi.mock('$app/navigation', () => ({
	goto: () => {},
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

describe('Pantalla Acerca de', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('muestra la versión de package.json', () => {
		instancia = mount(PaginaAcerca, { target: document.body });
		flushSync();

		expect(document.body.textContent).toContain(
			M.configuracion.acerca.version(paquete.version)
		);
	});

	it('nombra la autoría y que los datos no salen del teléfono', () => {
		instancia = mount(PaginaAcerca, { target: document.body });
		flushSync();

		expect(document.body.querySelector('h1')?.textContent?.trim()).toBe(
			M.configuracion.acerca.titulo
		);
		expect(document.body.textContent).toContain(M.configuracion.acerca.hechaPor);
		expect(document.body.textContent).toContain(M.configuracion.acerca.datosLocales);
	});
});
