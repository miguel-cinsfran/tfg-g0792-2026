import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Tests estructurales de los estilos globales: leen app.css como texto
// y fijan reglas que el render no puede medir (jsdom no aplica CSS).

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf-8');

function bloque(selector: string): string {
	const m = css.match(new RegExp(`(^|\\n)\\s*${selector}\\s*\\{([\\s\\S]*?)\\}`));
	if (!m) throw new Error(`selector ${selector} no encontrado en app.css`);
	return m[2];
}

describe('estilos globales (app.css)', () => {
	// A 2x en 360px el h1 de la sesion desbordaba en horizontal: la
	// palabra "entrenamiento" no tiene punto de quiebre. La propiedad
	// solo parte palabras cuando hace falta: a 1x no altera el layout.
	it.each(['h1', 'h2', 'h3', 'p'])('%s declara overflow-wrap: break-word', (selector) => {
		expect(bloque(selector)).toMatch(/overflow-wrap:\s*break-word/);
	});

	// Las view transitions de ruta estan declaradas en CSS: sin estas
	// reglas, startViewTransition produce el fundido por defecto que se
	// lee como web. El desplazamiento lateral va en los keyframes.
	it('declara view transitions laterales para las rutas', () => {
		expect(css).toMatch(/::view-transition-old\(root\)/);
		expect(css).toMatch(/::view-transition-new\(root\)/);
		expect(css).toMatch(/translateX/);
	});

	it('prefers-reduced-motion desactiva las transiciones de ruta', () => {
		const bloqueReducido = css.match(
			/@media \(prefers-reduced-motion: reduce\)\s*\{\s*::view-transition-old\(root\),\s*::view-transition-new\(root\)\s*\{([\s\S]*?)\}\s*\}/,
		);
		expect(bloqueReducido).not.toBeNull();
		expect(bloqueReducido![1]).toMatch(/animation:\s*none/);
	});
});
