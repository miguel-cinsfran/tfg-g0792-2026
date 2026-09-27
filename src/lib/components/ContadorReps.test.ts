// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ContadorReps from './ContadorReps.svelte';

// `anunciarPolite` se mockea aca para que el test no dependa de la
// region live global ni del orden de imports del modulo real.
vi.mock('$lib/a11y/live-region', () => ({
	anunciarPolite: vi.fn(),
	anunciarAssertive: vi.fn()
}));

describe('ContadorReps', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) {
			unmount(instancia);
		}
	});

	// Los signos van en spans decorativos: el valor es el hijo span
	// directo del grupo.
	function valorVisible(): string {
		return document.body.querySelector('[role="group"] > span')?.textContent?.trim() ?? '';
	}

	it('incrementa de 0 a 1', () => {
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 0 },
		});
		flushSync();
		const botonAgregar = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
		botonAgregar.click();
		flushSync();
		expect(valorVisible()).toBe('1');
	});

	it('decrementa de 1 a 0', () => {
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 1 },
		});
		flushSync();
		const botonQuitar = document.body.querySelector('[aria-label="Quitar una repetición"]') as HTMLButtonElement;
		botonQuitar.click();
		flushSync();
		expect(valorVisible()).toBe('0');
	});

	it('en el mínimo, el menos lleva aria-disabled sin disabled y no baja', () => {
		const onCambiar = vi.fn();
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 0, min: 0, onCambiar },
		});
		flushSync();
		const botonQuitar = document.body.querySelector('[aria-label="Quitar una repetición"]') as HTMLButtonElement;
		const botonAgregar = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
		expect(botonQuitar.getAttribute('aria-disabled')).toBe('true');
		expect(botonQuitar.hasAttribute('disabled')).toBe(false);
		expect(botonAgregar.hasAttribute('aria-disabled')).toBe(false);
		botonQuitar.click();
		flushSync();
		expect(valorVisible()).toBe('0');
		expect(onCambiar).not.toHaveBeenCalled();
	});

	it('en el máximo, el más lleva aria-disabled sin disabled y no sube', () => {
		const onCambiar = vi.fn();
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 99, max: 99, onCambiar },
		});
		flushSync();
		const botonAgregar = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
		const botonQuitar = document.body.querySelector('[aria-label="Quitar una repetición"]') as HTMLButtonElement;
		expect(botonAgregar.getAttribute('aria-disabled')).toBe('true');
		expect(botonAgregar.hasAttribute('disabled')).toBe(false);
		expect(botonQuitar.hasAttribute('aria-disabled')).toBe(false);
		botonAgregar.click();
		flushSync();
		expect(valorVisible()).toBe('99');
		expect(onCambiar).not.toHaveBeenCalled();
	});

	it('en valor intermedio ningún botón lleva aria-disabled', () => {
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 50, min: 0, max: 99 },
		});
		flushSync();
		const botonQuitar = document.body.querySelector('[aria-label="Quitar una repetición"]') as HTMLButtonElement;
		const botonAgregar = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
		expect(botonQuitar.hasAttribute('aria-disabled')).toBe(false);
		expect(botonAgregar.hasAttribute('aria-disabled')).toBe(false);
		expect(botonQuitar.hasAttribute('disabled')).toBe(false);
		expect(botonAgregar.hasAttribute('disabled')).toBe(false);
	});

	it('aria-labels presentes y correctos', () => {
		instancia = mount(ContadorReps, {
			target: document.body,
			props: { valor: 0 },
		});
		flushSync();
		const quitar = document.body.querySelector('[aria-label="Quitar una repetición"]');
		const agregar = document.body.querySelector('[aria-label="Agregar una repetición"]');
		expect(quitar).not.toBeNull();
		expect(agregar).not.toBeNull();
	});

	describe('paso configurable', () => {
		it('paso=5: de 50 a 55 con el boton mas, de 50 a 45 con el menos', () => {
			instancia = mount(ContadorReps, {
				target: document.body,
				props: { valor: 50, paso: 5 },
			});
			flushSync();
			const mas = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
			mas.click();
			flushSync();
			expect(valorVisible()).toBe('55');

			const menos = document.body.querySelector('[aria-label="Quitar una repetición"]') as HTMLButtonElement;
			menos.click();
			flushSync();
			expect(valorVisible()).toBe('50');
			menos.click();
			flushSync();
			expect(valorVisible()).toBe('45');
		});

		it('default sigue siendo paso=1 (compatibilidad con usos de sesion)', () => {
			instancia = mount(ContadorReps, {
				target: document.body,
				props: { valor: 0 },
			});
			flushSync();
			const mas = document.body.querySelector('[aria-label="Agregar una repetición"]') as HTMLButtonElement;
			mas.click();
			flushSync();
			expect(valorVisible()).toBe('1');
		});
	});

	describe('unidad="porcentaje" (stepper de volumen)', () => {
		it('visible muestra "N%" y el grupo lleva aria-label customizable', () => {
			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 50,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaGrupo: 'Volumen de efectos',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const grupo = document.body.querySelector('[role="group"]');
			expect(grupo?.getAttribute('aria-label')).toBe('Volumen de efectos');
			expect(valorVisible()).toBe('50%');
		});

		it('boton menos con aria-disabled en 0; boton mas con aria-disabled en 100', () => {
			// valor=0: el menos no debe hacer nada.
			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 0,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const menos0 = document.body.querySelector('[aria-label="Bajar volumen de efectos"]') as HTMLButtonElement;
			const mas0 = document.body.querySelector('[aria-label="Subir volumen de efectos"]') as HTMLButtonElement;
			expect(menos0.getAttribute('aria-disabled')).toBe('true');
			expect(menos0.hasAttribute('disabled')).toBe(false);
			expect(mas0.hasAttribute('aria-disabled')).toBe(false);
			unmount(instancia);
			instancia = undefined as unknown as ReturnType<typeof mount>;
			document.body.innerHTML = '';

			// valor=100: el mas no debe hacer nada.
			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 100,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const menos100 = document.body.querySelector('[aria-label="Bajar volumen de efectos"]') as HTMLButtonElement;
			const mas100 = document.body.querySelector('[aria-label="Subir volumen de efectos"]') as HTMLButtonElement;
			expect(menos100.hasAttribute('aria-disabled')).toBe(false);
			expect(mas100.getAttribute('aria-disabled')).toBe('true');
			expect(mas100.hasAttribute('disabled')).toBe(false);
		});

		it('clampa arriba: 95 + paso 5 -> 100 (visible "100%")', () => {
			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 95,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const mas = document.body.querySelector('[aria-label="Subir volumen de efectos"]') as HTMLButtonElement;
			mas.click();
			flushSync();
			expect(valorVisible()).toBe('100%');
		});

		it('clampa abajo: 5 - paso 5 -> 0 (visible "0%")', () => {
			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 5,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const menos = document.body.querySelector('[aria-label="Bajar volumen de efectos"]') as HTMLButtonElement;
			menos.click();
			flushSync();
			expect(valorVisible()).toBe('0%');
		});

		it('onCambiar se invoca solo cuando el valor efectivo cambia', async () => {
			const onCambiar = vi.fn();
			const { anunciarPolite } = await import('$lib/a11y/live-region');
			(anunciarPolite as ReturnType<typeof vi.fn>).mockClear();

			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 50,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos',
					onCambiar
				},
			});
			flushSync();
			const mas = document.body.querySelector('[aria-label="Subir volumen de efectos"]') as HTMLButtonElement;
			mas.click();
			flushSync();
			expect(onCambiar).toHaveBeenCalledTimes(1);
			expect(onCambiar).toHaveBeenCalledWith(55);
		});

		it('anuncia por la region global al cambiar ("N por ciento")', async () => {
			const { anunciarPolite } = await import('$lib/a11y/live-region');
			(anunciarPolite as ReturnType<typeof vi.fn>).mockClear();

			instancia = mount(ContadorReps, {
				target: document.body,
				props: {
					valor: 30,
					min: 0,
					max: 100,
					paso: 5,
					unidad: 'porcentaje',
					etiquetaMenos: 'Bajar volumen de efectos',
					etiquetaMas: 'Subir volumen de efectos'
				},
			});
			flushSync();
			const mas = document.body.querySelector('[aria-label="Subir volumen de efectos"]') as HTMLButtonElement;
			mas.click();
			flushSync();
			expect(anunciarPolite).toHaveBeenCalledWith('35 por ciento');
		});
	});
});