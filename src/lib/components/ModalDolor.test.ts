// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import EnvolturaModalTest from './EnvolturaModalTest.svelte';

const contenidoSnippet = createRawSnippet(() => ({
	render: () => '<span>Contenido del modal</span>',
}));

describe('ModalDolor', () => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) {
			unmount(instancia);
		}
	});

	it('al abrir, el foco va al h2', () => {
		// Crear boton externo y enfocarlo
		const botonExterno = document.createElement('button');
		botonExterno.id = 'btn-externo';
		document.body.appendChild(botonExterno);
		botonExterno.focus();

		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet, titulo: 'Confirmar' },
		});
		flushSync();

		// Hacer clic en el boton externo para abrir el modal
		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.click();
		flushSync();

		const h2 = document.body.querySelector('h2');
		expect(h2).not.toBeNull();
		// Verificar que el h2 fue enfocado (mover o spy)
		expect(document.activeElement).toBe(h2);
	});

	it('Escape llama alCerrar', () => {
		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet },
		});
		flushSync();

		// Abrir el modal
		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.click();
		flushSync();

		// Presionar Escape
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		flushSync();

		// Verificar que el modal se cerro: el dialogo ya no esta en el DOM
		const dialogo = document.body.querySelector('[role="dialog"]');
		expect(dialogo).toBeNull();
	});

	it('Tab desde ultimo focusable envuelve al primero', () => {
		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet },
		});
		flushSync();

		// Abrir el modal
		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.click();
		flushSync();

		const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
		const focusables = dialogo.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		expect(focusables.length).toBeGreaterThan(0);

		const ultimo = focusables[focusables.length - 1];
		ultimo.focus();
		flushSync();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		flushSync();

		expect(document.activeElement).toBe(focusables[0]);
	});

	it('Shift+Tab desde el primer focusable envuelve al ultimo', () => {
		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet },
		});
		flushSync();

		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.click();
		flushSync();

		const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
		const focusables = dialogo.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		focusables[0].focus();
		flushSync();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
		flushSync();

		expect(document.activeElement).toBe(focusables[focusables.length - 1]);
	});

	it('Tab con el foco en el h2 va al primer focusable', () => {
		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet },
		});
		flushSync();

		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.click();
		flushSync();

		// Al abrir, el foco quedo en el h2 (tabindex -1, fuera de la lista
		// de focusables): Tab debe entrar al primer focusable del dialogo.
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
		flushSync();

		const dialogo = document.body.querySelector('[role="dialog"]') as HTMLElement;
		const focusables = dialogo.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		expect(document.activeElement).toBe(focusables[0]);
	});

	it('al cerrar, restaura el foco al elemento previo', () => {
		// Montar la envoltura
		instancia = mount(EnvolturaModalTest, {
			target: document.body,
			props: { children: contenidoSnippet },
		});
		flushSync();

		// Enfocar el boton externo (que es parte del wrapper)
		const btnAbrir = document.getElementById('btn-abrir-externo') as HTMLButtonElement;
		btnAbrir.focus();
		flushSync();

		// Abrir el modal
		btnAbrir.click();
		flushSync();

		// Cerrar el modal con Escape
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		flushSync();

		expect(document.activeElement).toBe(btnAbrir);
	});
});