import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';

// Smoke de la configuracion de Capacitor: el arranque en frio declara
// el fondo de ventana con el color de superficie para no pintar oscuro
// antes del primer pintado web.

describe('configuracion de Capacitor', () => {
	it('declara backgroundColor con el color de superficie', () => {
		expect(config.backgroundColor).toBe('#F7F4EE');
	});

	it('declara el plugin de status bar con el color de superficie', () => {
		expect(config.plugins?.StatusBar?.backgroundColor).toBe('#F7F4EE');
	});

	it('declara el plugin de teclado con resize nativo', () => {
		expect(config.plugins?.Keyboard?.resize).toBe('native');
	});
});
