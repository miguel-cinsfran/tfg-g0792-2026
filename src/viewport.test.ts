// El viewport de app.html permite el zoom de pellizco: axe marcaba
// meta-viewport en todas las pantallas mientras lo bloqueaba.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

function contenidoViewport(): string {
	const html = readFileSync('src/app.html', 'utf-8');
	const match = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/);
	expect(match, 'existe el meta viewport').not.toBeNull();
	return match?.[1] ?? '';
}

describe('viewport de app.html', () => {
	it('no bloquea el zoom', () => {
		const contenido = contenidoViewport();
		expect(contenido).not.toContain('maximum-scale');
		expect(contenido).not.toContain('user-scalable');
	});

	it('conserva el ajuste al ancho y a la muesca', () => {
		const contenido = contenidoViewport();
		expect(contenido).toContain('width=device-width');
		expect(contenido).toContain('initial-scale=1');
		expect(contenido).toContain('viewport-fit=cover');
	});
});
