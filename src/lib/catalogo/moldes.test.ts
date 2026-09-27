import { describe, it, expect } from 'vitest';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { CatalogoSchema } from './schema';

const catalogo = CatalogoSchema.parse(catalogoRaw);

const IDS_OBJETIVO = [
	'ej-001-push-h-flexion-pared',
	'ej-002-push-h-flexion-inclinada',
	'ej-003-push-h-flexion-rodillas',
	'ej-004-push-h-flexion-estandar',
	'ej-010-push-v-pike-inclinado',
	'ej-011-push-v-pike-estandar',
	'ej-012-push-v-pike-pies-elevados',
	'ej-021-pull-h-remo-rodillas',
	'ej-020-pull-h-remo-suspension',
	'ej-022-pull-h-remo-pies-elevados',
	'ej-030-pull-v-dead-hang',
	'ej-031-pull-v-retraccion-escapular',
	'ej-032-pull-v-dominada-negativa',
	'ej-041-squat-sentadilla-silla',
	'ej-040-squat-sentadilla',
	'ej-042-squat-sentadilla-pausa',
	'ej-043-squat-sentadilla-salto',
	'ej-051-hinge-puente-gluteos',
	'ej-050-hinge-puente-una-pierna',
	'ej-052-hinge-peso-muerto-una-pierna',
	'ej-061-uni-subida-escalon',
	'ej-060-uni-zancada-estatica',
	'ej-062-uni-zancada-inversa',
	'ej-063-uni-sentadilla-bulgara',
	'ej-071-core-plancha-rodillas',
	'ej-070-core-plancha',
	'ej-072-core-hollow-hold',
	'ej-073-core-extension-cruzada',
	'ej-074-core-plancha-lateral-rodillas',
	'ej-075-core-plancha-lateral',
] as const;

// Patrones medidos el 25-08-2026. Comparación en minúsculas.
const MOLDES = [
	'sientes',
	'sensación de que',
	'notas que',
	'se nota',
	'el trabajo se nota',
	'un poco',
	'párate',
	'aguant',
	'queda',
	'quede',
	'quedar',
	'quedó',
	'trasero',
	'panza',
	// Frase inventada para evitar la natural: no se dice en espanol y ademas
	// no aclara cuales cuatro. Se dice "apoyate en el suelo con las manos y
	// las rodillas". El nombre del ejercicio ej-073 si la lleva, pero los
	// nombres no pasan por esta prueba.
	'cuatro apoyos',
	'vista',
	'—',
	'“',
	'”',
] as const;

function buscarMolde(linea: string): string | null {
	const lower = linea.toLowerCase();
	for (const molde of MOLDES) {
		if (lower.includes(molde)) return molde;
	}
	return null;
}

describe('catalogo: moldes de redacción en empuje, tirón, sentadilla, bisagra, unilateral y core', () => {
	it('los treinta ejercicios del catálogo no contienen moldes prohibidos', () => {
		const violaciones: string[] = [];
		for (const id of IDS_OBJETIVO) {
			const ejercicio = catalogo.ejercicios.find((e) => e.id === id);
			if (!ejercicio) {
				violaciones.push(`${id}: no encontrado`);
				continue;
			}
			for (const campo of Object.keys(ejercicio.descripcion) as Array<
				keyof typeof ejercicio.descripcion
			>) {
				const lineas = ejercicio.descripcion[campo] as string[];
				lineas.forEach((linea, idx) => {
					const molde = buscarMolde(linea);
					if (molde) {
						violaciones.push(
							`${ejercicio.id}::${campo}[${idx}]: "${linea}" contiene "${molde}"`,
						);
					}
				});
			}
		}
		expect(violaciones, violaciones.join('\n')).toEqual([]);
	});
});
