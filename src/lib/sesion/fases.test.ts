import { describe, it, expect } from 'vitest';
import { siguienteSubvista, armarEventoCerrarSerie } from './fases';
import type { Evento } from './fases';

describe('siguienteSubvista', () => {
	describe('reanudar', () => {
		it('REANUDAR + reanudar -> ir a EJERCICIO', () => {
			expect(siguienteSubvista('REANUDAR', { tipo: 'reanudar' })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('empezarNueva', () => {
		it('REANUDAR + empezarNueva -> ir a EJERCICIO', () => {
			expect(siguienteSubvista('REANUDAR', { tipo: 'empezarNueva' })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('cerrarSerie', () => {
		it('EJERCICIO con pregunta de esfuerzo -> POST_SERIE', () => {
			// Caso del chequeo semanal: la pregunta solo sale en la ultima
			// serie del ejercicio, no ejercitable hoy desde el navegador.
			expect(
				siguienteSubvista('EJERCICIO', {
					tipo: 'cerrarSerie',
					mostrarPreguntaEsfuerzo: true,
					esFinDeSesion: false,
					esUltimaSerieDelEjercicio: false,
				}),
			).toEqual({ tipo: 'ir-a', subvista: 'POST_SERIE' });
		});

		it('EJERCICIO al fin de sesion -> CIERRE', () => {
			expect(
				siguienteSubvista('EJERCICIO', {
					tipo: 'cerrarSerie',
					mostrarPreguntaEsfuerzo: false,
					esFinDeSesion: true,
					esUltimaSerieDelEjercicio: false,
				}),
			).toEqual({ tipo: 'ir-a', subvista: 'CIERRE' });
		});

		it('EJERCICIO en la ultima serie del ejercicio con ejercicios restantes -> EJERCICIO', () => {
			expect(
				siguienteSubvista('EJERCICIO', {
					tipo: 'cerrarSerie',
					mostrarPreguntaEsfuerzo: false,
					esFinDeSesion: false,
					esUltimaSerieDelEjercicio: true,
				}),
			).toEqual({ tipo: 'ir-a', subvista: 'EJERCICIO' });
		});

		it('EJERCICIO en medio del ejercicio -> DESCANSO', () => {
			expect(
				siguienteSubvista('EJERCICIO', {
					tipo: 'cerrarSerie',
					mostrarPreguntaEsfuerzo: false,
					esFinDeSesion: false,
					esUltimaSerieDelEjercicio: false,
				}),
			).toEqual({ tipo: 'ir-a', subvista: 'DESCANSO' });
		});
	});

	describe('continuarPostSerie', () => {
		it('POST_SERIE al fin de sesion -> CIERRE', () => {
			expect(
				siguienteSubvista('POST_SERIE', { tipo: 'continuarPostSerie', esFinDeSesion: true }),
			).toEqual({ tipo: 'ir-a', subvista: 'CIERRE' });
		});

		it('POST_SERIE con ejercicios restantes -> EJERCICIO', () => {
			expect(
				siguienteSubvista('POST_SERIE', { tipo: 'continuarPostSerie', esFinDeSesion: false }),
			).toEqual({ tipo: 'ir-a', subvista: 'EJERCICIO' });
		});
	});

	describe('finDescanso', () => {
		it('DESCANSO + finDescanso -> ir a EJERCICIO', () => {
			expect(siguienteSubvista('DESCANSO', { tipo: 'finDescanso' })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('abrirDolor', () => {
		it('EJERCICIO + abrirDolor -> ir a DOLOR_ZONAS', () => {
			expect(siguienteSubvista('EJERCICIO', { tipo: 'abrirDolor', desde: 'EJERCICIO' })).toEqual({
				tipo: 'ir-a',
				subvista: 'DOLOR_ZONAS',
			});
		});

		it('DESCANSO + abrirDolor -> ir a DOLOR_ZONAS', () => {
			expect(siguienteSubvista('DESCANSO', { tipo: 'abrirDolor', desde: 'DESCANSO' })).toEqual({
				tipo: 'ir-a',
				subvista: 'DOLOR_ZONAS',
			});
		});
	});

	describe('confirmarZonas', () => {
		it('DOLOR_ZONAS con sustituto -> DOLOR_SUSTITUTO', () => {
			// El flujo actual no llega a DOLOR_SUSTITUTO en la practica:
			// el pool nunca devuelve un sustituto hoy, pero la maquina
			// modela la rama completa del inventario.
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'confirmarZonas', haySustituto: true }),
			).toEqual({ tipo: 'ir-a', subvista: 'DOLOR_SUSTITUTO' });
		});

		it('DOLOR_ZONAS sin sustituto -> DOLOR_POOL', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'confirmarZonas', haySustituto: false }),
			).toEqual({ tipo: 'ir-a', subvista: 'DOLOR_POOL' });
		});
	});

	describe('cancelarDolorZonas', () => {
		it('DOLOR_ZONAS con origen EJERCICIO -> EJERCICIO', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'cancelarDolorZonas' }, { origenDolor: 'EJERCICIO' }),
			).toEqual({ tipo: 'ir-a', subvista: 'EJERCICIO' });
		});

		it('DOLOR_ZONAS con origen DESCANSO -> DESCANSO', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'cancelarDolorZonas' }, { origenDolor: 'DESCANSO' }),
			).toEqual({ tipo: 'ir-a', subvista: 'DESCANSO' });
		});

		it('DOLOR_ZONAS sin origen valido -> error', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'cancelarDolorZonas' }, { origenDolor: null }),
			).toEqual({ tipo: 'error', evento: 'cancelarDolorZonas', subvista: 'DOLOR_ZONAS' });
		});
	});

	describe('continuarSustituto', () => {
		it('DOLOR_SUSTITUTO + continuarSustituto -> ir a EJERCICIO', () => {
			expect(siguienteSubvista('DOLOR_SUSTITUTO', { tipo: 'continuarSustituto' })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('interrumpirPorDolor', () => {
		it('DOLOR_SUSTITUTO + interrumpirPorDolor -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_SUSTITUTO', { tipo: 'interrumpirPorDolor' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DOLOR_POOL + interrumpirPorDolor -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'interrumpirPorDolor' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});
	});

	describe('omitirPatron', () => {
		it('DOLOR_POOL al fin de sesion -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'omitirPatron', esFinDeSesion: true })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DOLOR_POOL con ejercicios restantes -> EJERCICIO', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'omitirPatron', esFinDeSesion: false })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('revisarZonas', () => {
		it('DOLOR_POOL + revisarZonas -> DOLOR_ZONAS', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'revisarZonas' })).toEqual({
				tipo: 'ir-a',
				subvista: 'DOLOR_ZONAS',
			});
		});

		it('DOLOR_SUSTITUTO + revisarZonas -> DOLOR_ZONAS', () => {
			expect(siguienteSubvista('DOLOR_SUSTITUTO', { tipo: 'revisarZonas' })).toEqual({
				tipo: 'ir-a',
				subvista: 'DOLOR_ZONAS',
			});
		});
	});

	describe('cancelarPostSerie', () => {
		it('POST_SERIE + cancelarPostSerie -> ir a EJERCICIO', () => {
			expect(siguienteSubvista('POST_SERIE', { tipo: 'cancelarPostSerie' })).toEqual({
				tipo: 'ir-a',
				subvista: 'EJERCICIO',
			});
		});
	});

	describe('salir', () => {
		it('REANUDAR + salir -> CIERRE', () => {
			expect(siguienteSubvista('REANUDAR', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('EJERCICIO + salir -> CIERRE', () => {
			expect(siguienteSubvista('EJERCICIO', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('POST_SERIE + salir -> CIERRE', () => {
			expect(siguienteSubvista('POST_SERIE', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DESCANSO + salir -> CIERRE', () => {
			expect(siguienteSubvista('DESCANSO', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DOLOR_ZONAS + salir -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_ZONAS', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DOLOR_SUSTITUTO + salir -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_SUSTITUTO', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});

		it('DOLOR_POOL + salir -> CIERRE', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'salir' })).toEqual({
				tipo: 'ir-a',
				subvista: 'CIERRE',
			});
		});
	});

	describe('eventos invalidos', () => {
		it('EJERCICIO + revisarZonas -> error', () => {
			expect(siguienteSubvista('EJERCICIO', { tipo: 'revisarZonas' })).toEqual({
				tipo: 'error',
				evento: 'revisarZonas',
				subvista: 'EJERCICIO',
			});
		});

		it('REANUDAR + finDescanso -> error', () => {
			expect(siguienteSubvista('REANUDAR', { tipo: 'finDescanso' })).toEqual({
				tipo: 'error',
				evento: 'finDescanso',
				subvista: 'REANUDAR',
			});
		});

		it('POST_SERIE + finDescanso -> error', () => {
			expect(siguienteSubvista('POST_SERIE', { tipo: 'finDescanso' })).toEqual({
				tipo: 'error',
				evento: 'finDescanso',
				subvista: 'POST_SERIE',
			});
		});

		it('DESCANSO + reanudar -> error', () => {
			expect(siguienteSubvista('DESCANSO', { tipo: 'reanudar' })).toEqual({
				tipo: 'error',
				evento: 'reanudar',
				subvista: 'DESCANSO',
			});
		});

		it('DOLOR_ZONAS + omitirPatron -> error', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'omitirPatron', esFinDeSesion: false }),
			).toEqual({
				tipo: 'error',
				evento: 'omitirPatron',
				subvista: 'DOLOR_ZONAS',
			});
		});

		it('DOLOR_SUSTITUTO + confirmarZonas -> error', () => {
			expect(
				siguienteSubvista('DOLOR_SUSTITUTO', { tipo: 'confirmarZonas', haySustituto: false }),
			).toEqual({
				tipo: 'error',
				evento: 'confirmarZonas',
				subvista: 'DOLOR_SUSTITUTO',
			});
		});

		it('DOLOR_POOL + continuarSustituto -> error', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'continuarSustituto' })).toEqual({
				tipo: 'error',
				evento: 'continuarSustituto',
				subvista: 'DOLOR_POOL',
			});
		});

		it('CIERRE + reanudar -> error', () => {
			expect(siguienteSubvista('CIERRE', { tipo: 'reanudar' })).toEqual({
				tipo: 'error',
				evento: 'reanudar',
				subvista: 'CIERRE',
			});
		});
	});

	describe('determinismo', () => {
		it('cerrarSerie con la misma entrada devuelve el mismo resultado', () => {
			const evento: Evento = {
				tipo: 'cerrarSerie',
				mostrarPreguntaEsfuerzo: false,
				esFinDeSesion: false,
				esUltimaSerieDelEjercicio: false,
			};
			expect(siguienteSubvista('EJERCICIO', evento)).toEqual(siguienteSubvista('EJERCICIO', evento));
		});

		it('cancelarDolorZonas con el mismo contexto devuelve el mismo resultado', () => {
			expect(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'cancelarDolorZonas' }, { origenDolor: 'DESCANSO' }),
			).toEqual(
				siguienteSubvista('DOLOR_ZONAS', { tipo: 'cancelarDolorZonas' }, { origenDolor: 'DESCANSO' }),
			);
		});

		it('omitirPatron con la misma entrada devuelve el mismo resultado', () => {
			expect(siguienteSubvista('DOLOR_POOL', { tipo: 'omitirPatron', esFinDeSesion: true })).toEqual(
				siguienteSubvista('DOLOR_POOL', { tipo: 'omitirPatron', esFinDeSesion: true }),
			);
		});
	});
});

describe('armarEventoCerrarSerie', () => {
	// Plan de 3 ejercicios (indices 0, 1, 2), cada uno de 2 series.
	// El ejercicio "intermedio" es el de indice 1; el "ultimo" es el 2.
	it('primera serie de un ejercicio intermedio, sesion normal', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 1,
				totalEjercicios: 3,
				serieCompletada: 1,
				totalSeries: 2,
				esChequeo: false,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: false,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('ultima serie de un ejercicio intermedio, sesion normal', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 1,
				totalEjercicios: 3,
				serieCompletada: 2,
				totalSeries: 2,
				esChequeo: false,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: true,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('primera serie del ultimo ejercicio, sesion normal (el defecto)', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 2,
				totalEjercicios: 3,
				serieCompletada: 1,
				totalSeries: 2,
				esChequeo: false,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: false,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('ultima serie del ultimo ejercicio, sesion normal', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 2,
				totalEjercicios: 3,
				serieCompletada: 2,
				totalSeries: 2,
				esChequeo: false,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: true,
			esFinDeSesion: true,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('primera serie de un ejercicio intermedio, sesion de chequeo', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 1,
				totalEjercicios: 3,
				serieCompletada: 1,
				totalSeries: 2,
				esChequeo: true,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: false,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('ultima serie de un ejercicio intermedio, sesion de chequeo', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 1,
				totalEjercicios: 3,
				serieCompletada: 2,
				totalSeries: 2,
				esChequeo: true,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: true,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: true,
		});
	});

	it('primera serie del ultimo ejercicio, sesion de chequeo', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 2,
				totalEjercicios: 3,
				serieCompletada: 1,
				totalSeries: 2,
				esChequeo: true,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: false,
			esFinDeSesion: false,
			mostrarPreguntaEsfuerzo: false,
		});
	});

	it('ultima serie del ultimo ejercicio, sesion de chequeo', () => {
		expect(
			armarEventoCerrarSerie({
				indiceEjercicio: 2,
				totalEjercicios: 3,
				serieCompletada: 2,
				totalSeries: 2,
				esChequeo: true,
			}),
		).toEqual({
			tipo: 'cerrarSerie',
			esUltimaSerieDelEjercicio: true,
			esFinDeSesion: true,
			mostrarPreguntaEsfuerzo: true,
		});
	});

	it('regresion: primera serie del ultimo ejercicio lleva a DESCANSO, no a CIERRE', () => {
		const evento = armarEventoCerrarSerie({
			indiceEjercicio: 2,
			totalEjercicios: 3,
			serieCompletada: 1,
			totalSeries: 2,
			esChequeo: false,
		});
		expect(siguienteSubvista('EJERCICIO', evento)).toEqual({ tipo: 'ir-a', subvista: 'DESCANSO' });
	});
});
