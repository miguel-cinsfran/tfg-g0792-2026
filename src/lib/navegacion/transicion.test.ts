import { describe, it, expect, beforeEach } from 'vitest';
import {
	decidirTransicion,
	marcarProximaComoVolver,
	consumirMarcaVolver,
} from './transicion';

describe('decidirTransicion', () => {
	it('pestana -> pestana no anima (dos pares distintos)', () => {
		expect(decidirTransicion('/', '/biblioteca', 'goto', false)).toBe('ninguna');
		expect(decidirTransicion('/perfil', '/progreso', 'goto', false)).toBe('ninguna');
	});

	it('Perfil -> Configuracion es adelante', () => {
		expect(decidirTransicion('/perfil', '/config', 'goto', false)).toBe('adelante');
	});

	it('volver desde Configuracion es atras', () => {
		expect(decidirTransicion('/config', '/perfil', 'goto', true)).toBe('atras');
	});

	it('popstate siempre es atras, aun sin marca', () => {
		expect(decidirTransicion('/config/aspecto', '/config', 'popstate', false)).toBe('atras');
	});

	it('sin rutas conocidas es adelante (navegacion inicial)', () => {
		expect(decidirTransicion(null, '/biblioteca', 'goto', false)).toBe('adelante');
	});
});

describe('marca de volver', () => {
	beforeEach(() => {
		consumirMarcaVolver();
	});

	it('se consume una sola vez', () => {
		marcarProximaComoVolver();
		expect(consumirMarcaVolver()).toBe(true);
		expect(consumirMarcaVolver()).toBe(false);
	});
});
