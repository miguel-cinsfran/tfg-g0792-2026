// Integridad referencial del contenido real (catalogo.json)
// contra las reglas que el motor asume:
// - ALG-09 sigue progresion_id/regresion_id como cadena lineal por patron.
// - ALG-06 respeta el mapa curado `sustituciones` SIN filtros, asi que
//   cada destino curado debe evitar de verdad la zona dolorida.
// - ALG-04 llena slots de templates.json filtrando por patron+subpatron
//   y nivel: cada slot necesita pool en nivel principiante o esa sesion
//   nace incompleta para usuarios nuevos.
// Deuda saldada: "al completar los ~25 ejercicios, agregar test de
// integridad referencial" (anotada al detectar referencias colgadas en
// el catalogo semilla).

import { describe, it, expect } from 'vitest';
import { CatalogoSchema } from './schema';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import templatesRaw from '$lib/../../static/data/templates.json' with { type: 'json' };
import { TIPOS_SESION } from '$lib/motor/schema';

const catalogo = CatalogoSchema.parse(catalogoRaw).ejercicios;
const porId = new Map(catalogo.map((e) => [e.id, e]));

describe('catalogo: integridad referencial', () => {
	it('los IDs son unicos', () => {
		expect(porId.size).toBe(catalogo.length);
	});

	it('tiene el volumen objetivo del MVP (25-30 ejercicios)', () => {
		expect(catalogo.length).toBeGreaterThanOrEqual(25);
		expect(catalogo.length).toBeLessThanOrEqual(30);
	});

	it('progresion_id y regresion_id apuntan a ejercicios existentes, sin auto-referencia', () => {
		for (const e of catalogo) {
			for (const ref of [e.progresion_id, e.regresion_id]) {
				if (ref === null) continue;
				expect(porId.has(ref), `${e.id} -> ${ref}`).toBe(true);
				expect(ref).not.toBe(e.id);
			}
		}
	});

	it('las cadenas de progresion no cambian de patron ni de subpatron', () => {
		for (const e of catalogo) {
			for (const ref of [e.progresion_id, e.regresion_id]) {
				if (ref === null) continue;
				const destino = porId.get(ref)!;
				expect(destino.patron, `${e.id} -> ${ref}`).toBe(e.patron);
				expect(destino.subpatron, `${e.id} -> ${ref}`).toBe(e.subpatron);
			}
		}
	});

	it('las cadenas son reciprocas: si A progresa a B, B regresa a A (y viceversa)', () => {
		for (const e of catalogo) {
			if (e.progresion_id !== null) {
				expect(porId.get(e.progresion_id)!.regresion_id, `prog ${e.id}`).toBe(e.id);
			}
			if (e.regresion_id !== null) {
				expect(porId.get(e.regresion_id)!.progresion_id, `reg ${e.id}`).toBe(e.id);
			}
		}
	});

	it('cada sustitucion curada existe y NO involucra la zona que sustituye (regla ALG-06)', () => {
		for (const e of catalogo) {
			for (const [zona, ref] of Object.entries(e.sustituciones)) {
				const destino = porId.get(ref!);
				expect(destino, `${e.id} [${zona}] -> ${ref}`).toBeDefined();
				expect(ref).not.toBe(e.id);
				expect(
					destino!.zonas_involucradas,
					`${e.id} [${zona}] -> ${ref} involucra la zona`,
				).not.toContain(zona);
			}
		}
	});

	it('subpatron esta definido exactamente en los ejercicios CORE', () => {
		for (const e of catalogo) {
			if (e.patron === 'CORE') {
				expect(e.subpatron, e.id).toBeDefined();
			} else {
				expect(e.subpatron, e.id).toBeUndefined();
			}
		}
	});

	it('cada slot de templates.json tiene pool en nivel principiante', () => {
		for (const tipo of TIPOS_SESION) {
			const plantilla = (templatesRaw as Record<string, unknown>)[tipo] as {
				slots: { id: string; patron: string; subpatron?: string }[];
			};
			for (const slot of plantilla.slots) {
				const pool = catalogo.filter(
					(e) =>
						e.patron === slot.patron &&
						e.nivel_requerido === 'principiante' &&
						(slot.subpatron === undefined || e.subpatron === slot.subpatron),
				);
				expect(pool.length, `slot ${slot.id} (${tipo})`).toBeGreaterThan(0);
			}
		}
	});

	it('ningun texto quedo marcado PLACEHOLDER', () => {
		const texto = JSON.stringify(catalogo);
		expect(texto).not.toContain('PLACEHOLDER');
	});
});
