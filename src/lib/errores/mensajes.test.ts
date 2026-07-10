import { describe, it, expect } from 'vitest';
import { mensajePara } from './mensajes';

describe('mensajePara', () => {
	it('devuelve el mensaje mapeado para ERR-BOOT-CATALOGO', () => {
		const msg = mensajePara('ERR-BOOT-CATALOGO');
		expect(msg).toContain('catálogo');
	});

	it('devuelve el mensaje mapeado para ERR-DB-WRITE', () => {
		const msg = mensajePara('ERR-DB-WRITE');
		expect(msg).toContain('guardar');
	});

	it('devuelve el mensaje mapeado para ERR-IMPORT-INVALID', () => {
		const msg = mensajePara('ERR-IMPORT-INVALID');
		expect(msg).toContain('formato');
	});

	it('incluye el código en el fallback para códigos desconocidos', () => {
		const msg = mensajePara('ERR-UNKNOWN-TEST');
		expect(msg).toContain('ERR-UNKNOWN-TEST');
		expect(msg).toContain('error inesperado');
	});
});
