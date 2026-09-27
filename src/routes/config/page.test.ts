// @vitest-environment jsdom
//
// Indice de configuracion: la fila Aspecto muestra la etiqueta guardada,
// y las filas de dias y duracion abren una ventana de opciones donde
// elegir aplica al instante. Sin mock de avisar: el canal real escribe
// en las regiones globales, que el test instala en el DOM y lee.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import IndiceConfig from './+page.svelte';
import type { Perfil, EstadoEjercicio, Zona } from '$lib/motor/schema';
import { guardarAspecto } from '$lib/aspecto/aspecto';
import { M } from '$lib/mensajes/ui';

const estadoMock = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	actualizarPerfilMock: vi.fn(),
	alRecibirPerfil: null as null | ((p: Perfil | null) => void),
	alRecibirBloqueados: null as null | ((b: EstadoEjercicio[]) => void),
	bloqueados: [] as EstadoEjercicio[],
	zonas: [] as Zona[],
	perfil: {
		id: 1,
		nombre: 'Ada',
		anio_nacimiento: 1985,
		peso_kg: 60,
		disclaimer_aceptado: true,
		fecha_aceptacion_disclaimer: 0,
		objetivo: 'fuerza',
		nivel_experiencia: 'principiante',
		evaluacion_por_patron: {
			PUSH: 'principiante',
			PULL: 'principiante',
			LEGS: 'principiante',
			CORE: 'principiante'
		},
		ajuste_desbalance_activo: null,
		fecha_evaluacion: 0,
		dias_semana: 3,
		duracion_sesion_min: 30,
		split: 'FULL_BODY',
		zonas_dolor_preexistente: [],
		tiene_anclaje: false,
		fecha_primera_sesion: null
	} as Perfil
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => estadoMock.gotoMock(...args)
}));

vi.mock('$app/paths', () => ({
	resolve: (ruta: string) => ruta
}));

// Imita Dexie + liveQuery: cada escritura re-emite el perfil nuevo a la
// suscripcion, asi las filas muestran el valor aplicado.
vi.mock('$lib/db/consultas', () => ({
	suscribirPerfil: (alRecibir: (perfil: Perfil | null) => void) => {
		estadoMock.alRecibirPerfil = alRecibir;
		alRecibir({ ...estadoMock.perfil, zonas_dolor_preexistente: [...estadoMock.zonas] });
		return () => {};
	},
	suscribirBloqueados: (alRecibir: (bloqueados: EstadoEjercicio[]) => void) => {
		estadoMock.alRecibirBloqueados = alRecibir;
		alRecibir([...estadoMock.bloqueados]);
		return () => {};
	}
}));

vi.mock('$lib/db/perfil', () => ({
	actualizarPerfil: async (parche: Partial<Perfil>) => {
		estadoMock.actualizarPerfilMock(parche);
		Object.assign(estadoMock.perfil, parche);
		estadoMock.alRecibirPerfil?.({ ...estadoMock.perfil });
		return 1;
	}
}));

vi.mock('$lib/sonido/reproducir', () => ({
	sonar: () => {}
}));

function instalarRegiones(): void {
	const polite = document.createElement('div');
	polite.id = 'live-polite';
	const assertive = document.createElement('div');
	assertive.id = 'live-assertive';
	document.body.append(polite, assertive);
}

function filaDias(): HTMLButtonElement {
	const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
		(b.getAttribute('aria-label') ?? '').startsWith(M.configuracion.indice.plan.diasPorSemana)
	);
	expect(fila, 'existe la fila de días').not.toBeUndefined();
	return fila as HTMLButtonElement;
}

function filaDuracion(): HTMLButtonElement {
	const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
		(b.getAttribute('aria-label') ?? '').startsWith(M.configuracion.indice.plan.duracion)
	);
	expect(fila, 'existe la fila de duración').not.toBeUndefined();
	return fila as HTMLButtonElement;
}

function textoFilaAspecto(): string {
	const filas = [...document.querySelectorAll('button.fila-configuracion')];
	const fila = filas.find((b) => b.textContent?.includes('Aspecto'));
	expect(fila, 'existe la fila Aspecto').not.toBeUndefined();
	return (fila?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function elegirRadio(valor: string): void {
	const input = document.querySelector(`input[value="${valor}"]`) as HTMLInputElement;
	expect(input, `existe la opción ${valor}`).not.toBeNull();
	input.click();
	flushSync();
}

function bloqueado(id: string): EstadoEjercicio {
	return {
		ejercicio_id: id,
		series_objetivo: 3,
		reps_objetivo: 8,
		bloqueado: true,
		razon_bloqueo: 'Dolor en muñecas',
		fecha_bloqueo: 1,
		fecha_revision: null,
		fecha_ultimo_uso: null,
	} as EstadoEjercicio;
}

function filaDolor(): HTMLButtonElement {
	const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
		(b.getAttribute('aria-label') ?? '').startsWith(M.configuracion.indice.dolor.zonasConDolor)
	);
	expect(fila, 'existe la fila de dolor').not.toBeUndefined();
	return fila as HTMLButtonElement;
}

describe('Indice de configuracion', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
		instalarRegiones();
		localStorage.clear();
		estadoMock.perfil.dias_semana = 3;
		estadoMock.perfil.duracion_sesion_min = 30;
		estadoMock.perfil.tiene_anclaje = false;
		estadoMock.zonas = [];
		estadoMock.bloqueados = [];
		estadoMock.gotoMock.mockReset();
		estadoMock.actualizarPerfilMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
	});

	it('sin aspecto guardado la fila muestra "Según el teléfono"', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		expect(textoFilaAspecto()).toContain(M.configuracion.aspecto.sistemaEtiqueta);
	});

	it('con contraste guardado la fila muestra "Alto contraste"', () => {
		guardarAspecto('contraste');
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		expect(textoFilaAspecto()).toContain(M.configuracion.aspecto.contrasteEtiqueta);
	});

	it('tocar la fila de días abre la ventana con las opciones', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		filaDias().click();
		flushSync();

		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
		for (const dias of ['2', '3', '4', '5']) {
			expect(document.querySelector(`input[value="${dias}"]`)).not.toBeNull();
		}
		expect(estadoMock.actualizarPerfilMock).not.toHaveBeenCalled();
	});

	it('elegir 4 aplica, cierra, actualiza la fila, avisa y devuelve el foco', async () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = filaDias();
		fila.click();
		flushSync();
		elegirRadio('4');

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledWith({ dias_semana: 4 });
		});
		await vi.waitFor(() => {
			expect(document.querySelector('[role="dialog"]')).toBeNull();
		});
		expect(fila.getAttribute('aria-label')).toBe(M.configuracion.indice.plan.diasFila(4));
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(fila);
		});
		await vi.waitFor(() => {
			expect(document.getElementById('live-polite')?.textContent).toBe(
				M.configuracion.disponibilidad.avisoDias(4)
			);
		});
	});

	it('el atrás del sistema cierra la ventana sin cambiar nada', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		filaDias().click();
		flushSync();
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();

		window.dispatchEvent(new CustomEvent('volveratras', { cancelable: true }));
		flushSync();

		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(estadoMock.actualizarPerfilMock).not.toHaveBeenCalled();
		expect(filaDias().getAttribute('aria-label')).toBe(M.configuracion.indice.plan.diasFila(3));
	});

	it('elegir 45 minutos aplica, cierra y devuelve el foco a su fila', async () => {		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = filaDuracion();
		fila.click();
		flushSync();
		elegirRadio('45');

		await vi.waitFor(() => {
			expect(estadoMock.actualizarPerfilMock).toHaveBeenCalledWith({ duracion_sesion_min: 45 });
		});
		await vi.waitFor(() => {
			expect(document.querySelector('[role="dialog"]')).toBeNull();
		});
		expect(fila.getAttribute('aria-label')).toBe(M.configuracion.indice.plan.duracionFila(45));
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(fila);
		});
	});

	it('la fila de equipo dice "sin barra ni anclaje" cuando no hay', () => {
		estadoMock.perfil.tiene_anclaje = false;
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Equipo:')
		);
		expect(fila?.getAttribute('aria-label')).toBe('Equipo: sin barra ni anclaje');
		expect(fila?.textContent).toContain('Sin barra ni anclaje');
	});

	it('la fila de equipo dice "con barra o anclaje" cuando hay', () => {
		estadoMock.perfil.tiene_anclaje = true;
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Equipo:')
		);
		expect(fila?.getAttribute('aria-label')).toBe('Equipo: con barra o anclaje');
		expect(fila?.textContent).toContain('Con barra o anclaje');
	});

	it('con muñecas declaradas y un ejercicio en pausa la fila dice las dos cosas', () => {
		estadoMock.zonas = ['muñecas'];
		estadoMock.bloqueados = [bloqueado('ej-001')];
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = filaDolor();
		expect(fila.getAttribute('aria-label')).toBe(
			`${M.configuracion.indice.dolor.zonasFila('muñecas')} ${M.configuracion.indice.dolor.enPausa(1)}`
		);
		expect(fila.textContent).toContain('muñecas');
		expect(fila.textContent).toContain('1 ejercicio en pausa');
	});

	it('sin zonas ni bloqueados la fila dice ninguna y sin segunda línea', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = filaDolor();
		expect(fila.getAttribute('aria-label')).toBe(
			M.configuracion.indice.dolor.zonasFila(M.configuracion.dolor.ninguna)
		);
		expect(fila.textContent).toContain(M.configuracion.dolor.ninguna);
		expect(fila.textContent).not.toContain('en pausa');
	});

	it('con dos ejercicios en pausa el plural es correcto', () => {
		estadoMock.bloqueados = [bloqueado('ej-001'), bloqueado('ej-002')];
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		expect(filaDolor().textContent).toContain('2 ejercicios en pausa');
	});

	it('la fila de datos personales lleva ese nombre y abre la pantalla', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.textContent ?? '').includes('Datos personales')
		);
		expect(fila, 'existe la fila Datos personales').not.toBeUndefined();
		(fila as HTMLButtonElement).click();
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/config/datos');
	});

	it('la sección de exportar, importar y borrar se llama Copia de seguridad', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const seccion = document.getElementById('sec-datos');
		expect(seccion?.textContent?.trim()).toBe(M.configuracion.indice.tusDatos.titulo);
		expect(M.configuracion.indice.tusDatos.titulo).toBe('Copia de seguridad');
		const filas = seccion?.parentElement?.querySelectorAll('button.fila-configuracion') ?? [];
		expect(filas.length).toBe(3);
	});

	it('Borrar todo lleva texto e ícono en el color de error del tema', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.textContent ?? '').includes(M.configuracion.indice.tusDatos.borrarTodo)
		);
		expect(fila, 'existe la fila Borrar todo').not.toBeUndefined();
		// text-error es la referencia al color de error del tema: sin
		// hoja de estilos en jsdom es la única traza observable del
		// color pedido, no un enganche de maquetación.
		const etiqueta = [...(fila as HTMLButtonElement).querySelectorAll('span')].find((s) =>
			(s.textContent ?? '').includes(M.configuracion.indice.tusDatos.borrarTodo)
		);
		expect(etiqueta?.classList.contains('text-error')).toBe(true);
		expect(fila?.querySelector('svg')?.classList.contains('text-error')).toBe(true);
	});

	it('Borrar todo es la última fila de su sección', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const filas = [...document.querySelectorAll('#sec-datos ~ div button.fila-configuracion')];
		expect(filas.length).toBe(3);
		expect(filas[filas.length - 1].textContent).toContain(
			M.configuracion.indice.tusDatos.borrarTodo
		);
	});

	it('la fila Acerca de abre la pantalla', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.textContent ?? '').includes(M.configuracion.indice.informacion.acercaDe)
		);
		expect(fila, 'existe la fila Acerca de').not.toBeUndefined();
		(fila as HTMLButtonElement).click();
		expect(estadoMock.gotoMock).toHaveBeenCalledWith('/config/acerca');
	});

	it('la fila conmutadora es botón sin role=switch, con dibujo oculto al lector', () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const fila = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Mantener la pantalla encendida')
		);
		expect(fila, 'existe la fila de pantalla').not.toBeUndefined();
		expect(fila?.getAttribute('role')).toBeNull();
		const dibujo = fila?.querySelector('span[aria-hidden="true"]');
		expect(dibujo, 'existe el dibujo del interruptor').not.toBeNull();
		expect(dibujo?.querySelectorAll(':scope > span').length).toBe(1);
	});

	it('al alternar cambia el nombre accesible y el dibujo sigue ahí', async () => {
		instancia = mount(IndiceConfig, { target: document.body });
		flushSync();

		const antes = [...document.querySelectorAll('button.fila-configuracion')].find((b) =>
			(b.getAttribute('aria-label') ?? '').startsWith('Mantener la pantalla encendida')
		) as HTMLButtonElement;
		const nombreAntes = antes.getAttribute('aria-label');
		antes.click();
		flushSync();

		await vi.waitFor(() => {
			expect(antes.getAttribute('aria-label')).not.toBe(nombreAntes);
		});
		expect(antes.getAttribute('role')).toBeNull();
		expect(antes.querySelector('span[aria-hidden="true"]')).not.toBeNull();
	});
});
