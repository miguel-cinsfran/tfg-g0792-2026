// Un perfil con varias limitaciones a la vez: sin barra ni anclaje,
// dolor de muñecas, 12 flexiones y 0 sentadillas. El plan no puede
// pedir un ejercicio que exige anclaje, ni subir de nivel a un grupo
// que la prueba dejó en 0, ni evaluar un grupo que el dolor vacía, ni
// avisar por un grupo que el plan no incluye.

// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '$lib/db/db';
import { reiniciar } from '$lib/onboarding/estado';
import { finalizar } from '$lib/onboarding/finalizar';
import { generarSesion } from '$lib/motor/generador';
import type { SesionCompletada } from '$lib/motor/schema';
import { establecerCatalogo } from '$lib/catalogo/estado';
import { CatalogoSchema } from '$lib/catalogo/schema';
import catalogoRaw from '$lib/../../static/data/catalogo.json' with { type: 'json' };
import { estadoOnboardingCompleto } from '../../../tests/fixtures/onboarding-base';
import { AHORA } from '../../../tests/fixtures/ahora';

const DIA_MS = 86_400_000;

beforeEach(async () => {
	if (!db.isOpen()) await db.open();
	establecerCatalogo(CatalogoSchema.parse(catalogoRaw).ejercicios);
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
	establecerCatalogo([]);
	reiniciar();
});

describe('perfil con limitaciones: sin anclaje, muñecas y piernas en 0', () => {
	it('diez sesiones sin anclaje, con munecas y legs en 0 cumplen el contrato', async () => {
		const perfil = await finalizar(
			estadoOnboardingCompleto({
				anio_nacimiento: 1991,
				peso_kg: 72.5,
				altura_cm: 175,
				objetivo: 'hipertrofia',
				tiene_anclaje: false,
				zonas_dolor_preexistente: ['muñecas'],
				dias_semana: 3,
				duracion_sesion_min: 30,
				reps_push: null,
				reps_pull: null,
				reps_legs: 0,
				segundos_core: 20,
			}),
			AHORA,
		);
		expect(perfil.grupos_desde_base).toContain('LEGS');

		const catalogo = CatalogoSchema.parse(catalogoRaw).ejercicios;
		const porId = new Map(catalogo.map((e) => [e.id, e]));
		const historial: SesionCompletada[] = [];
		for (let i = 0; i < 10; i++) {
			const r = generarSesion('FULL_BODY', perfil, catalogo, [], historial);
			expect(r.patrones_sin_pool).toEqual([]);
			expect(r.plan.length).toBeGreaterThan(0);
			for (const item of r.plan) {
				const ejercicio = porId.get(item.ejercicio_id)!;
				expect(ejercicio.requiere_anclaje).toBe(false);
				expect(ejercicio.zonas_involucradas).not.toContain('muñecas');
				if (['SQUAT', 'HINGE', 'UNILATERAL'].includes(ejercicio.patron)) {
					expect([
						'ej-041-squat-sentadilla-silla',
						'ej-051-hinge-puente-gluteos',
						'ej-061-uni-subida-escalon',
					]).toContain(item.ejercicio_id);
				}
			}
			historial.push({
				id: `regresion-sesion-${i}`,
				fecha: AHORA + i * DIA_MS,
				tipo: 'FULL_BODY',
				ejercicios: r.plan.map((p) => ({
					ejercicio_id: p.ejercicio_id,
					series_planificadas: p.series,
					series_completadas: p.series,
					reps_planificadas: p.reps_objetivo,
					reps_reales: [],
					rir_declarado: [],
					zonas_dolor_reportadas: [],
				})),
				duracion_minutos: 30,
				cancelada_por_dolor: false,
			});
		}
	});
});
