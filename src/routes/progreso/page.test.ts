// @vitest-environment jsdom
//
// Fecha del historial en numeros: el summary de
// cada sesion muestra DD/MM/AAAA, no la fecha en letras. Dos casos con
// fechas distintas, uno con dia y mes de un digito.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { mount, unmount, flushSync } from 'svelte';
import PaginaProgreso from './+page.svelte';
import { perfilBase } from '$lib/../../tests/fixtures/perfil-base';
import type { SesionCompletada } from '$lib/motor/schema';

const estadoMock = vi.hoisted(() => ({
	perfil: null as unknown,
	historial: [] as SesionCompletada[],
	gotoMock: vi.fn(),
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args),
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta,
}));

vi.mock('$lib/db/perfil', () => ({
	obtenerPerfil: () => Promise.resolve(estadoMock.perfil),
}));

vi.mock('$lib/db/sesiones', () => ({
	obtenerHistorial: () => Promise.resolve(estadoMock.historial),
	obtenerUltimaSesion: () => Promise.resolve(null),
}));

vi.mock('$lib/db/dolor', () => ({
	obtenerHistorialDolor: () => Promise.resolve([]),
}));

function sesionEn(fecha: number): SesionCompletada {
	return {
		id: `sesion-${fecha}`,
		fecha,
		tipo: 'FULL_BODY',
		ejercicios: [],
		duracion_minutos: 20,
		cancelada_por_dolor: false,
	};
}

describe('Historial de sesiones: fecha en numeros', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		estadoMock.perfil = perfilBase();
		estadoMock.gotoMock.mockReset();
		// Mediodia local: lejos de los bordes de huso horario.
		estadoMock.historial = [
			sesionEn(new Date(2026, 8, 26, 12).getTime()),
			sesionEn(new Date(2026, 2, 5, 12).getTime()),
		];
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	async function montar(): Promise<void> {
		instancia = mount(PaginaProgreso, { target: document.body });
		flushSync();
		await vi.waitFor(() => {
			expect(document.body.textContent).toContain('26/09/2026');
		});
	}

	it('la sesion del 26 de septiembre muestra 26/09/2026', async () => {
		await montar();
		expect(document.body.textContent).toContain('26/09/2026');
		expect(document.body.textContent).not.toContain('septiembre');
	});

	it('la sesion del 5 de marzo muestra 05/03/2026', async () => {
		await montar();
		expect(document.body.textContent).toContain('05/03/2026');
		expect(document.body.textContent).not.toContain('marzo');
	});
});
