// Cierra el hueco del cast de templates.json en reglas.ts: el compilador
// no puede verificar literales de union en un import JSON (de ahi el
// `as TemplatesShape`), asi que este test valida en runtime lo que el
// cast silencia (ADR-0003 regla 3). rules y objetivos no lo necesitan:
// su asignacion tipada si la verifica el compilador.
import { describe, it, expect } from 'vitest';
import { templates } from './reglas';
import { PATRONES, SUBPATRONES_CORE, TIPOS_SESION } from './schema';

// Se itera por TIPOS_SESION y no por Object.entries: el JSON ademas
// trae claves de metadata (_meta, _prioridad_series) que no son templates.
describe('templates.json contra el contrato', () => {
	it('cada slot usa un patron de PATRONES y un subpatron de SUBPATRONES_CORE', () => {
		for (const nombre of TIPOS_SESION) {
			const def = templates[nombre];
			for (const slot of def.slots) {
				expect(PATRONES, `template ${nombre}, slot ${slot.id}`).toContain(slot.patron);
				if (slot.subpatron !== undefined) {
					expect(SUBPATRONES_CORE, `template ${nombre}, slot ${slot.id}`).toContain(
						slot.subpatron,
					);
				}
			}
		}
	});

	it('los IDs de slot no se repiten dentro de un template', () => {
		for (const nombre of TIPOS_SESION) {
			const ids = templates[nombre].slots.map((s) => s.id);
			expect(new Set(ids).size, `template ${nombre}`).toBe(ids.length);
		}
	});
});
