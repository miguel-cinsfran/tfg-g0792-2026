// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Cronometro from './Cronometro.svelte';
import FlechaDerecha from './FlechaDerecha.svelte';
import Equis from './Equis.svelte';
import Bandera from './Bandera.svelte';
import Casa from './Casa.svelte';
import Llama from './Llama.svelte';
import GraficoBarras from './GraficoBarras.svelte';

describe.each([
	['Cronometro', Cronometro],
	['FlechaDerecha', FlechaDerecha],
	['Equis', Equis],
	['Bandera', Bandera],
])('icono %s', (_nombre, Componente) => {
	let instancia: ReturnType<typeof mount>;

	beforeEach(() => {
		document.body.innerHTML = '';
	});

	afterEach(() => {
		if (instancia) {
			unmount(instancia);
		}
	});

	it('renderiza svg con aria-hidden', () => {
		instancia = mount(Componente, { target: document.body });
		flushSync();
		const svg = document.body.querySelector('svg');
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	it('aplica tamano y clase personalizados', () => {
		instancia = mount(Componente, {
			target: document.body,
			props: { tamano: '2em', clase: 'mi-clase' },
		});
		flushSync();
		const svg = document.body.querySelector('svg')!;
		expect(svg.getAttribute('width')).toBe('2em');
		expect(svg.getAttribute('height')).toBe('2em');
		expect(svg.classList.contains('mi-clase')).toBe(true);
	});
});

// La pestaña activa se dibuja maciza: el layout pasa relleno según la
// ruta. Estos casos fijan que el dibujo con relleno es el "fill" del
// apendice y no el "bold".
const casosRelleno: Array<[string, typeof Casa, string, string]> = [
	[
		'Casa',
		Casa,
		'M222.14,105.85l-80-80a20,20,0,0,0-28.28,0l-80,80A19.86,19.86,0,0,0,28,120v96a12,12,0,0,0,12,12h64a12,12,0,0,0,12-12V164h24v52a12,12,0,0,0,12,12h64a12,12,0,0,0,12-12V120A19.86,19.86,0,0,0,222.14,105.85ZM204,204H164V152a12,12,0,0,0-12-12H104a12,12,0,0,0-12,12v52H52V121.65l76-76,76,76Z',
		'M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z',
	],
	[
		'Llama',
		Llama,
		'M176.69,48.72a225,225,0,0,0-42.52-35,12,12,0,0,0-12.34,0,225,225,0,0,0-42.52,35C51,78.47,36,111.42,36,144a92,92,0,0,0,184,0C220,111.42,205,78.47,176.69,48.72ZM100,184c0-13.33,5.53-26.26,16.45-38.45A93,93,0,0,1,128,134.72a93,93,0,0,1,11.55,10.83C150.47,157.74,156,170.67,156,184a28,28,0,0,1-56,0Zm79.84,3.94c.09-1.3.16-2.61.16-3.94,0-46.26-44-73.17-45.83-74.29a12,12,0,0,0-12.34,0C120,110.83,76,137.74,76,184c0,1.33.07,2.64.16,3.94A67.68,67.68,0,0,1,60,144c0-26.52,12.21-52.86,36.28-78.3A213.07,213.07,0,0,1,128,38.39C145.82,50.86,196,90.71,196,144A67.68,67.68,0,0,1,179.84,187.94Z',
		'M173.79,51.48a221.25,221.25,0,0,0-41.67-34.34,8,8,0,0,0-8.24,0A221.25,221.25,0,0,0,82.21,51.48C54.59,80.48,40,112.47,40,144a88,88,0,0,0,176,0C216,112.47,201.41,80.48,173.79,51.48ZM96,184c0-27.67,22.53-47.28,32-54.3,9.48,7,32,26.63,32,54.3a32,32,0,0,1-64,0Z',
	],
	[
		'GraficoBarras',
		GraficoBarras,
		'M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z',
		'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16h8V136a8,8,0,0,1,8-8H72a8,8,0,0,1,8,8v64H96V88a8,8,0,0,1,8-8h32a8,8,0,0,1,8,8V200h16V40a8,8,0,0,1,8-8h40a8,8,0,0,1,8,8V200h8A8,8,0,0,1,232,208Z',
	],
];

describe.each(casosRelleno)('icono con relleno %s', (_nombre, Componente, dibujoBold, dibujoFill) => {
	function dibujo(relleno: boolean): string | null {
		document.body.innerHTML = '';
		const instancia = mount(Componente, { target: document.body, props: { relleno } });
		flushSync();
		const d = document.body.querySelector('svg path')?.getAttribute('d') ?? null;
		unmount(instancia);
		document.body.innerHTML = '';
		return d;
	}

	it('dibuja un path distinto con relleno que sin el, y cada uno es el del apendice', () => {
		const sinRelleno = dibujo(false);
		const conRelleno = dibujo(true);
		expect(sinRelleno).toBe(dibujoBold);
		expect(conRelleno).toBe(dibujoFill);
		expect(conRelleno).not.toBe(sinRelleno);
	});
});
