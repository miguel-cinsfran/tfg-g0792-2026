// Guarda contra piezas huérfanas: componentes sin importar y claves de mensajes sin renderizar.
// Verifica efectos (que algo quedó sin usar) no formas.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { M } from '$lib/mensajes/ui';

function* listarSvelteComponentes(raiz: string): Generator<string> {
	for (const entrada of readdirSync(raiz)) {
		const completa = join(raiz, entrada);
		const stat = statSync(completa);
		if (stat.isDirectory()) {
			yield* listarSvelteComponentes(completa);
		} else if (entrada.endsWith('.svelte') && !entrada.endsWith('Test.svelte')) {
			yield completa;
		}
	}
}

function* listarArchivosSrc(raiz: string): Generator<string> {
	for (const entrada of readdirSync(raiz)) {
		const completa = join(raiz, entrada);
		const stat = statSync(completa);
		if (stat.isDirectory()) {
			yield* listarArchivosSrc(completa);
		} else if ((completa.endsWith('.svelte') || completa.endsWith('.ts')) && !completa.includes('.test.')) {
			// Las pruebas quedan fuera a proposito: un componente que solo
			// importa su propia prueba esta huerfano igual, y contarlas
			// hacia que la guarda lo diera por usado.
			yield completa;
		}
	}
}

function colectarClaves(obj: unknown, prefijo: string, out: Map<string, unknown>): void {
	if (typeof obj === 'string' || typeof obj === 'function') {
		out.set(prefijo, obj);
		return;
	}
	if (Array.isArray(obj)) {
		if (obj.length > 0 && typeof obj[0] === 'string') out.set(prefijo, obj);
		return;
	}
	if (obj !== null && typeof obj === 'object') {
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			colectarClaves(v, `${prefijo}.${k}`, out);
		}
	}
}

describe('guarda de huérfanos', () => {
	it('ningún componente de src/lib/components queda sin importar en src', () => {
		const componentes = [...listarSvelteComponentes('src/lib/components')];
		const archivosSrc = [...listarArchivosSrc('src')];
		const huerfanos: string[] = [];
		for (const comp of componentes) {
			const base = comp.split('/').pop()!.replace('.svelte', '');
			const usado = archivosSrc.some((ruta) => {
				if (ruta === comp) return false;
				const contenido = readFileSync(ruta, 'utf-8');
				return contenido.includes(`${base}.svelte`) || new RegExp(`import\\s+.*\\b${base}\\b`).test(contenido);
			});
			const usadoAmplio = usado || archivosSrc.some((ruta) => {
				if (ruta === comp) return false;
				return readFileSync(ruta, 'utf-8').includes(comp.replace('src/', ''));
			});
			if (!usadoAmplio) huerfanos.push(comp);
		}
		expect(huerfanos, `componentes huérfanos: ${huerfanos.join(', ')}`).toEqual([]);
	});

	it('ninguna clave de M queda sin renderizar en una pantalla', () => {
		const mapa = new Map<string, unknown>();
		colectarClaves(M, 'M', mapa);
		const pantallas = [...listarArchivosSrc('src/routes')].filter((p) => p.endsWith('+page.svelte') || p.endsWith('+layout.svelte'));
		const componentes = [...listarArchivosSrc('src/lib/components')];
		const huerfanas: string[] = [];
		for (const [clave, valor] of mapa.entries()) {
			const usadaEnPantalla = pantallas.some((ruta) => readFileSync(ruta, 'utf-8').includes(clave));
			const usadaEnComponente = componentes.some((ruta) => readFileSync(ruta, 'utf-8').includes(clave));
			if (usadaEnPantalla || usadaEnComponente) continue;
			// Caso nivel: acceso dinámico via M.onboarding.resumen.nivel[clave]
			if (clave.startsWith('M.onboarding.resumen.nivel.')) {
				const padre = 'M.onboarding.resumen.nivel';
				const padreUsado = pantallas.some((r) => readFileSync(r, 'utf-8').includes(padre)) || componentes.some((r) => readFileSync(r, 'utf-8').includes(padre));
				if (padreUsado) continue;
			}
			// Caso campos técnicos: el valor literal aparece en la pantalla aunque la clave no se importe directa (label hardcodeado)
			if (typeof valor === 'string' && pantallas.some((r) => readFileSync(r, 'utf-8').includes(valor))) continue;
			huerfanas.push(clave);
		}
		expect(huerfanas, `claves huérfanas: ${huerfanas.join(', ')}`).toEqual([]);
	});
});
