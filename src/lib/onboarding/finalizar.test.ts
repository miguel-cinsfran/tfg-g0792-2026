// Tests de finalizar(estado, ahora): orquestador de cierre del onboarding.
// TDD estricto: RED primero, luego GREEN.
// ADR-0001: nunca Date.now() en tests; usar AHORA del fixture.
// ADR-0012: vecino al codigo, fake-indexeddb para integracion con Dexie.

// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '$lib/db/db';
import { obtenerPerfil } from '$lib/db/perfil';
import { obtener, actualizar, reiniciar } from '$lib/onboarding/estado';
import { AHORA } from '../../../tests/fixtures/ahora';
import { estadoOnboardingCompleto } from '../../../tests/fixtures/onboarding-base';
import { evaluarNivelInicial } from '$lib/motor/evaluacion';

// Se importa al final del archivo porque finalizar.ts no existe aun (RED).
// Descomentar cuando exista:
import { finalizar } from './finalizar';

beforeEach(async () => {
	if (!db.isOpen()) {
		await db.open();
	}
});

afterEach(async () => {
	await Promise.all(db.tables.map((t) => t.clear()));
	reiniciar();
});

describe('finalizar', () => {
	it('happy path con anclaje: persiste Perfil completo y reinicia estado', async () => {
		const estado = estadoOnboardingCompleto();
		const perfil = await finalizar(estado, AHORA);

		expect(perfil.id).toBe(1);
		expect(perfil.nombre).toBe('Persona de prueba');
		expect(perfil.anio_nacimiento).toBe(1995);
		expect(perfil.peso_kg).toBe(70);
		expect(perfil.altura_cm).toBe(170);
		expect(perfil.disclaimer_aceptado).toBe(true);
		expect(perfil.fecha_aceptacion_disclaimer).toBe(AHORA);
		expect(perfil.objetivo).toBe('hipertrofia');
		expect(perfil.tiene_anclaje).toBe(true);
		expect(perfil.dias_semana).toBe(3);
		expect(perfil.duracion_sesion_min).toBe(30);
		expect(perfil.fecha_primera_sesion).toBeNull();
		expect(perfil.zonas_dolor_preexistente).toEqual([]);

		// Motor calcula nivel y split con los reps del fixture
		const resultadoMotor = evaluarNivelInicial(
			{
				reps_push: estado.reps_push!,
				reps_pull: estado.reps_pull!,
				reps_legs: estado.reps_legs!,
				segundos_core: estado.segundos_core!,
				tiene_anclaje: estado.tiene_anclaje!,
			},
			AHORA,
		);
		expect(perfil.nivel_experiencia).toBe(resultadoMotor.nivel_global);
		expect(perfil.evaluacion_por_patron).toEqual(resultadoMotor.evaluacion_por_patron);
		expect(perfil.ajuste_desbalance_activo).toEqual(resultadoMotor.ajuste_desbalance_activo);
		expect(perfil.fecha_evaluacion).toBe(AHORA);

		// Perfil tambien persiste en Dexie
		const persistido = await obtenerPerfil();
		expect(persistido).toEqual(perfil);

		// Estado en memoria fue reiniciado
		const estadoActual = obtener();
		expect(estadoActual.nombre).toBeNull();
		expect(estadoActual.reps_push).toBeNull();
	});

	it('sin mesa y reps_pull null: pasa 0 al motor y persiste reps_pull 0', async () => {
		const estado = estadoOnboardingCompleto({ tiene_anclaje: false, reps_pull: null });
		const perfil = await finalizar(estado, AHORA);

		expect(perfil.tiene_anclaje).toBe(false);
		// El motor recibe reps_pull: 0; principiante con 0 reps
		const resultadoMotor = evaluarNivelInicial(
			{
				reps_push: estado.reps_push!,
				reps_pull: 0,
				reps_legs: estado.reps_legs!,
				segundos_core: estado.segundos_core!,
				tiene_anclaje: false,
			},
			AHORA,
		);
		expect(perfil.nivel_experiencia).toBe(resultadoMotor.nivel_global);
		expect(perfil.evaluacion_por_patron.PULL).toBe('principiante');
	});

	it('altura_cm null: key omitida del Perfil', async () => {
		const estado = estadoOnboardingCompleto({ altura_cm: null });
		const perfil = await finalizar(estado, AHORA);

		expect('altura_cm' in perfil).toBe(false);
	});

	it('zonas_dolor_preexistente null: array vacio en Perfil', async () => {
		const estado = estadoOnboardingCompleto({ zonas_dolor_preexistente: null });
		const perfil = await finalizar(estado, AHORA);

		expect(perfil.zonas_dolor_preexistente).toEqual([]);
	});

	it('fecha_aceptacion_disclaimer null: usa ahora como fallback', async () => {
		const estado = estadoOnboardingCompleto({ fecha_aceptacion_disclaimer: null });
		const perfil = await finalizar(estado, AHORA);

		expect(perfil.fecha_aceptacion_disclaimer).toBe(AHORA);
	});

	it('campo requerido null lanza TypeError sin invocar motor', async () => {
		const estado = estadoOnboardingCompleto({ nombre: null });

		await expect(finalizar(estado, AHORA)).rejects.toThrow(TypeError);
	});

	it('guardarPerfil rechaza: ERR-DB-WRITE propaga sin reiniciar estado', async () => {
		const estado = estadoOnboardingCompleto();
		// Poblar el estado del modulo para verificar que no se reinicia
		actualizar(estado);

		// Forzar error en Dexie cerrando la conexion
		db.close();

		await expect(finalizar(estado, AHORA)).rejects.toMatchObject({
			code: 'ERR-DB-WRITE',
		});

		// Estado NO fue reiniciado
		const estadoActual = obtener();
		expect(estadoActual.nombre).toBe('Persona de prueba');
		expect(estadoActual.reps_push).toBe(15);

		// Reabrir para afterEach
		await db.open();
	});

	it('evaluacion incompleta lanza nombrando el campo (sin fluir como 0 al motor)', async () => {
		await expect(
			finalizar(estadoOnboardingCompleto({ reps_push: null }), AHORA),
		).rejects.toThrow('reps_push');
		await expect(
			finalizar(estadoOnboardingCompleto({ segundos_core: null }), AHORA),
		).rejects.toThrow('segundos_core');
		// Con mesa, reps_pull tambien es obligatorio (sin mesa cae a 0).
		await expect(
			finalizar(estadoOnboardingCompleto({ tiene_anclaje: true, reps_pull: null }), AHORA),
		).rejects.toThrow('reps_pull');
	});

	it('desbalance reportado cuando hay patron debil', async () => {
		// reps_push muy alto, reps_pull muy bajo → desbalance
		const estado = estadoOnboardingCompleto({
			reps_push: 30,
			reps_pull: 2,
			tiene_anclaje: true,
		});
		const perfil = await finalizar(estado, AHORA);

		expect(perfil.ajuste_desbalance_activo).not.toBeNull();
		expect(perfil.ajuste_desbalance_activo!.patron).toBe('PULL');
	});
});
