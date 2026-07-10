import { describe, it, expect } from 'vitest';
import { obtenerVistaPrevia } from './vista-previa';
import type { Ejercicio } from './schema';
import { ejercicioBase } from '../../../tests/fixtures/ejercicio-base';
import { perfilBase } from '../../../tests/fixtures/perfil-base';
import { sesionBase } from '../../../tests/fixtures/sesion-base';
import { AHORA } from '../../../tests/fixtures/ahora';

// Integracion de la composicion ALG-02 + ALG-03 + ALG-04 con el motor
// real: los unitarios de cada pieza viven en split.test.ts y
// generador.test.ts.

function catalogo(): Ejercicio[] {
	return [
		ejercicioBase({ id: 'ej-push-h', patron: 'PUSH_H' }),
		ejercicioBase({ id: 'ej-pull-h', patron: 'PULL_H' }),
		ejercicioBase({ id: 'ej-pull-v', patron: 'PULL_V' }),
		ejercicioBase({ id: 'ej-squat', patron: 'SQUAT' }),
		ejercicioBase({ id: 'ej-push-v', patron: 'PUSH_V' }),
		ejercicioBase({ id: 'ej-hinge', patron: 'HINGE' }),
		ejercicioBase({ id: 'ej-uni', patron: 'UNILATERAL' }),
		ejercicioBase({ id: 'ej-core-ae', patron: 'CORE', subpatron: 'ANTI_EXTENSION' }),
		ejercicioBase({ id: 'ej-core-ar', patron: 'CORE', subpatron: 'ANTI_ROTATION' }),
	];
}

describe('obtenerVistaPrevia (composicion)', () => {
	it('perfil principiante full body: la proxima sesion es FULL_BODY completa', () => {
		const v = obtenerVistaPrevia(perfilBase(), [], [], null, catalogo(), AHORA);
		expect(v.tipo).toBe('FULL_BODY');
		expect(v.plan).toHaveLength(6);
		expect(v.patrones_sin_pool).toEqual([]);
	});

	it('perfil intermedio de 4 dias alterna UPPER y LOWER segun la ultima sesion', () => {
		const perfil = perfilBase({ nivel_experiencia: 'intermedio', dias_semana: 4 });
		const sinPrevia = obtenerVistaPrevia(perfil, [], [], null, catalogo(), AHORA);
		expect(sinPrevia.tipo).toBe('UPPER');
		const trasUpper = obtenerVistaPrevia(
			perfil,
			[],
			[],
			sesionBase({ tipo: 'UPPER' }),
			catalogo(),
			AHORA,
		);
		expect(trasUpper.tipo).toBe('LOWER');
		expect(trasUpper.patrones_sin_pool).toEqual([]);
	});

	it('es determinista de punta a punta', () => {
		const a = obtenerVistaPrevia(perfilBase(), [], [], null, catalogo(), AHORA);
		const b = obtenerVistaPrevia(perfilBase(), [], [], null, catalogo(), AHORA);
		expect(a).toEqual(b);
	});
});
