import { describe, it, expect } from 'vitest';
import { PATRONES, TIPOS_SESION, ZONAS } from '$lib/motor/schema';
import { etiquetaPatron, etiquetaTipoSesion, etiquetaZona } from './etiquetas';

describe('etiquetaPatron', () => {
	it('cubre los 8 patrones con etiquetas no vacias y distintas del crudo', () => {
		PATRONES.forEach((p) => {
			const etiqueta = etiquetaPatron(p);
			expect(etiqueta.length, `etiqueta para ${p} no vacia`).toBeGreaterThan(0);
			expect(etiqueta, `etiqueta para ${p} distinta del valor crudo`).not.toBe(p);
		});
	});
});

describe('etiquetaTipoSesion', () => {
	it('cubre los 3 tipos con etiquetas no vacias y distintas del crudo', () => {
		TIPOS_SESION.forEach((t) => {
			const etiqueta = etiquetaTipoSesion(t);
			expect(etiqueta.length, `etiqueta para ${t} no vacia`).toBeGreaterThan(0);
			expect(etiqueta, `etiqueta para ${t} distinta del valor crudo`).not.toBe(t);
		});
	});
});

describe('etiquetaZona', () => {
	it('cubre las 8 zonas con etiquetas no vacias', () => {
		ZONAS.forEach((z) => {
			const etiqueta = etiquetaZona(z);
			expect(etiqueta.length, `etiqueta para ${z} no vacia`).toBeGreaterThan(0);
		});
	});
});