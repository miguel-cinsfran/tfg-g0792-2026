import { describe, it, expect } from 'vitest';
import { M } from './ui';

describe('M.progreso - línea del historial', () => {
	// La unica entrada del historial con logica real: compone nombre,
	// series y valores unidos; no nombra la unidad (no siempre son
	// repeticiones, hay segundos).
	it('lineaHistorial: "Flexiones: 3 de 3 series. Cada serie: 8, 8, 7"', () => {
		expect(M.progreso.lineaHistorial('Flexiones', 3, 3, '8, 8, 7')).toBe(
			'Flexiones: 3 de 3 series. Cada serie: 8, 8, 7',
		);
	});
});

describe('M.sesion.objetivo - camino isometrico', () => {
	// Para isometrico el margen RIR no aplica: se muestra solo
	// "Sostén X segundos" sin la parte del margen.
	it('isometrico: omite el margen y dice "Sostén 30 segundos"', () => {
		const resultado = M.sesion.objetivo(30, 'segundos', 2);
		expect(resultado).toBe('Sostén 30 segundos.');
		expect(resultado).not.toContain('más');
	});

	it('isometrico: formatea como tiempo si supera 60s', () => {
		const resultado = M.sesion.objetivo(90, 'segundos', 2);
		expect(resultado).toBe('Sostén 1 minuto 30 segundos.');
	});
});

describe('M.perfil.resumen - lineas del plan', () => {
	it('diasSemana: Etiqueta valor sin punto', () => {
		expect(M.perfil.resumen.diasSemana(1)).toBe('Días por semana: 1');
	});

	it('diasSemana: plural con el mismo formato', () => {
		expect(M.perfil.resumen.diasSemana(5)).toBe('Días por semana: 5');
	});

	it('duracion: minutos con coma de formato horario', () => {
		expect(M.perfil.resumen.duracion(30)).toBe('Duración: 30 minutos');
	});

	it('duracion: otro valor con el mismo formato', () => {
		expect(M.perfil.resumen.duracion(45)).toBe('Duración: 45 minutos');
	});

	it('equipo: con o sin barra ni anclaje', () => {
		expect(M.perfil.resumen.equipo(true)).toBe('Equipo: con barra o anclaje');
		expect(M.perfil.resumen.equipo(false)).toBe('Equipo: sin barra ni anclaje');
	});

	it('zonasDolor: lista o ninguna', () => {
		expect(M.perfil.resumen.zonasDolor('muñecas')).toBe('Zonas con dolor: muñecas');
		expect(M.perfil.resumen.zonasDolorNinguna).toBe('Zonas con dolor: ninguna');
	});
});

describe('M.onboarding.resumen.patronDebil - lenguaje llano', () => {
	it('PUSH se lee empujar y CORE se lee abdomen', () => {
		expect(M.onboarding.resumen.patronDebil('PUSH')).toBe(
			'Tu punto más débil es empujar (flexiones). Tendrá prioridad en tus entrenamientos.'
		);
		expect(M.onboarding.resumen.patronDebil('CORE')).toBe(
			'Tu punto más débil es abdomen (plancha). Tendrá prioridad en tus entrenamientos.'
		);
	});

	it('PULL se lee tirar', () => {
		expect(M.onboarding.resumen.patronDebil('PULL')).toBe(
			'Tu punto más débil es tirar (remo). Tendrá prioridad en tus entrenamientos.'
		);
	});
});

describe('textos llanos de sesion, inicio y biblioteca', () => {
	it('omitir habla de ejercicio y el reemplazo de cargar la zona', () => {
		expect(M.sesion.botonOmitirPatron).toBe('Saltar este ejercicio hoy');
		expect(M.sesion.patronOmitido).toBe('Ejercicio saltado');
		expect(M.sesion.dolorSinReemplazoTitulo).toBe('No hay otro ejercicio que no cargue esa zona');
	});

	it('patronesSinPool nombra los patrones y la causa (dolor)', () => {
		expect(M.inicio.patronesSinPool('sentadillas')).toBe(
			'Hoy no hay ejercicios de sentadillas que no carguen una zona con dolor.'
		);
	});

	it('la bienvenida a las pruebas no dice patron de movimiento ni nucleo', () => {
		const texto = M.onboarding.evaluacion.push.introduccion(4);
		expect(texto).toContain('empujar, tirar, piernas y abdomen');
		expect(texto).not.toContain('patrón de movimiento');
		expect(texto).not.toContain('núcleo');
	});

	it('las claves de forma se llaman como lo que son', () => {
		expect(M.componentes.descripcionEjercicio.referenciasPropioceptivas).toBe(
			'Cómo notar que lo haces bien'
		);
	});
});

describe('M.onboarding.evaluacion.push.introduccion - conteo dinamico', () => {
	it('cuatro pruebas: ultimas cuatro preguntas', () => {
		expect(M.onboarding.evaluacion.push.introduccion(4)).toContain('Últimas cuatro preguntas');
	});

	it('tres pruebas: ultimas tres preguntas', () => {
		expect(M.onboarding.evaluacion.push.introduccion(3)).toContain('Últimas tres preguntas');
	});

	it('una prueba: ultima pregunta en singular', () => {
		const texto = M.onboarding.evaluacion.push.introduccion(1);
		expect(texto).toContain('Última pregunta');
		expect(texto).not.toContain('Últimas');
	});
});

describe('M.onboarding.resumen - lineas del alta', () => {
	it('fraseNivel con cuatro pruebas dice por que', () => {
		expect(M.onboarding.resumen.fraseNivel('principiante', 4)).toBe(
			'Tu nivel es principiante: es el que más se repitió en tus cuatro pruebas.'
		);
	});

	it('fraseNivel con una prueba va en singular', () => {
		expect(M.onboarding.resumen.fraseNivel('intermedio', 1)).toBe(
			'Tu nivel es intermedio: es el de tu única prueba.'
		);
	});

	it('lineaPrueba nombra grupo, valor y nivel', () => {
		expect(M.onboarding.resumen.lineaPrueba('PUSH', 12, 'principiante')).toBe(
			'Empujar: 12 flexiones, principiante.'
		);
		expect(M.onboarding.resumen.lineaPrueba('CORE', 45, 'intermedio')).toBe(
			'Abdomen: 45 segundos de plancha, intermedio.'
		);
	});

	it('pruebaSalteadaDolor nombra el grupo y la zona', () => {
		expect(M.onboarding.resumen.pruebaSalteadaDolor('PUSH', 'muñecas')).toBe(
			'Empujar: no se probó por el dolor en muñecas.'
		);
	});

	it('frases de fuera del plan con la causa', () => {
		expect(M.onboarding.resumen.fraseFueraPorAnclaje).toBe(
			'Tu plan no incluye ejercicios de tirar porque necesitan una barra o un anclaje.'
		);
		expect(M.onboarding.resumen.fraseFueraPorDolor('muñecas')).toBe(
			'Tu plan deja fuera los ejercicios que cargan las zonas con dolor que marcaste: muñecas.'
		);
	});

	it('planResumen y primeraSesion componen dias, duracion y nombres', () => {
		expect(M.onboarding.resumen.planResumen(3, '30 minutos')).toBe(
			'Entrenas 3 días por semana en sesiones de 30 minutos.'
		);
		expect(M.onboarding.resumen.primeraSesion('cuerpo completo', 'Flexiones, Sentadillas')).toBe(
			'Tu primera sesión es de cuerpo completo: Flexiones, Sentadillas.'
		);
	});
});

describe('M.perfil.resumen.imcValor - decimal con coma', () => {
	it('23.7 se muestra 23,7', () => {
		expect(M.perfil.resumen.imcValor(23.7)).toBe('23,7');
	});

	it('22.5 se muestra 22,5', () => {
		expect(M.perfil.resumen.imcValor(22.5)).toBe('22,5');
	});
});

describe('M.biblioteca - fuera del plan', () => {
	it('por anclaje dice la causa', () => {
		expect(M.biblioteca.fueraPorAnclaje).toBe('No entra en tu plan: necesita barra o anclaje');
	});

	it('por dolor nombra las zonas que toca', () => {
		expect(M.biblioteca.fueraPorDolor('muñecas')).toBe('No entra en tu plan: carga muñecas');
	});
});

describe('M.sesion - descanso extendido', () => {
	it('lineaDespues nombra ejercicio y serie', () => {
		expect(M.sesion.lineaDespues('Flexiones', 2, 3)).toBe('Después: Flexiones, serie 2 de 3');
	});

	it('lineaDespues sin siguiente dice que terminas', () => {
		expect(M.sesion.lineaDespues(null, 0, 0)).toBe('Después: terminas la sesión');
	});

	it('anuncioDescansoExtendido dice el restante con formato', () => {
		expect(M.sesion.anuncioDescansoExtendido(130)).toBe('Descanso: 2 minutos 10 segundos');
		expect(M.sesion.botonSumarDescanso).toBe('+30 segundos');
	});
});

describe('M.inicio - boton con sesion guardada', () => {
	it('dice Continuar sesion, no Empezar entrenamiento', () => {
		expect(M.inicio.botonEmpezarEntrenamientoSesion).toBe('Continuar sesión');
	});

	it('difiere del boton sin sesion', () => {
		expect(M.inicio.botonEmpezarEntrenamientoSesion).not.toBe(M.inicio.botonEmpezarEntrenamiento);
	});
});

describe('M.modal - cierres del dialogo', () => {
	it('cerrar y volver son strings no vacios y distintos', () => {
		expect(M.modal.cerrar).toBe('Cerrar');
		expect(M.modal.volver).toBe('Volver');
		expect(M.modal.cerrar.length).toBeGreaterThan(0);
		expect(M.modal.volver.length).toBeGreaterThan(0);
		expect(M.modal.cerrar).not.toBe(M.modal.volver);
	});
});

describe('M.sesion.errorPlanVacio - plan vacio', () => {
	it('texto exacto del contrato', () => {
		expect(M.sesion.errorPlanVacio).toBe(
			'No hay ejercicios seguros para tus zonas con dolor actuales. Revisa tus zonas para desbloquear ejercicios.',
		);
	});
});

describe('M.configuracion.datos.avisoValidacion - validacion de Mis datos', () => {
	// El aviso se escucha tambien cuando el campo esta completo pero el
	// valor es imposible (ej. edad 999): la frase no puede hablar de
	// "campos por completar".
	it('texto exacto del contrato', () => {
		expect(M.configuracion.datos.avisoValidacion).toBe('Revisa los datos: hay campos con errores.');
	});
});

describe('M.ayuda.titulo - nombre de la pantalla de ayuda', () => {
	// "Ayuda" en el h1 y en el titulo del documento, igual que el boton
	// que lleva hasta ahi.
	it('texto exacto del contrato', () => {
		expect(M.ayuda.titulo).toBe('Ayuda');
	});
});
