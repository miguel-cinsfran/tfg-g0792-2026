import { describe, it, expect } from 'vitest';
import { M } from './ui';
import { CONSEJOS } from '$lib/consejos/datos';

type Entrada = { clave: string; valor: string };

function recoger(): Entrada[] {
	const entradas: Entrada[] = [];
	function visitar(obj: unknown, prefijo: string): void {
		if (typeof obj === 'string') {
			entradas.push({ clave: prefijo, valor: obj });
			return;
		}
		if (Array.isArray(obj)) {
			obj.forEach((v, i) => visitar(v, `${prefijo}[${i}]`));
			return;
		}
		if (obj !== null && typeof obj === 'object') {
			for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
				if (typeof v === 'function') continue;
				visitar(v, `${prefijo}.${k}`);
			}
		}
	}
	visitar(M.onboarding, 'M.onboarding');
	const patrones = ['PUSH', 'PULL', 'LEGS', 'CORE'] as const;
	for (const p of patrones) {
		const valor = M.onboarding.resumen.patronDebil(p);
		entradas.push({ clave: `M.onboarding.resumen.patronDebil(${p})`, valor });
	}
	entradas.push(
		{ clave: 'M.onboarding.resumen.fraseNivel(4)', valor: M.onboarding.resumen.fraseNivel('principiante', 4) },
		{ clave: 'M.onboarding.resumen.fraseNivel(1)', valor: M.onboarding.resumen.fraseNivel('principiante', 1) },
		{ clave: 'M.onboarding.resumen.lineaPrueba(PUSH)', valor: M.onboarding.resumen.lineaPrueba('PUSH', 12, 'principiante') },
		{ clave: 'M.onboarding.resumen.lineaPrueba(CORE)', valor: M.onboarding.resumen.lineaPrueba('CORE', 45, 'intermedio') },
		{ clave: 'M.onboarding.resumen.pruebaSalteadaDolor', valor: M.onboarding.resumen.pruebaSalteadaDolor('PUSH', 'muñecas') },
		{ clave: 'M.onboarding.resumen.fraseFueraPorDolor', valor: M.onboarding.resumen.fraseFueraPorDolor('muñecas') },
		{ clave: 'M.onboarding.resumen.planResumen', valor: M.onboarding.resumen.planResumen(3, '30 minutos') },
		{ clave: 'M.onboarding.resumen.primeraSesion', valor: M.onboarding.resumen.primeraSesion('cuerpo completo', 'Flexiones') },
	);
	return entradas;
}

function contiene(valor: string, token: string): boolean {
	return valor.toLowerCase().includes(token);
}

function visitarGenerico(obj: unknown, prefijo: string, out: Entrada[]): void {
	if (typeof obj === 'string') {
		out.push({ clave: prefijo, valor: obj });
		return;
	}
	if (Array.isArray(obj)) {
		obj.forEach((v, i) => visitarGenerico(v, `${prefijo}[${i}]`, out));
		return;
	}
	if (obj !== null && typeof obj === 'object') {
		for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
			if (typeof v === 'function') continue;
			visitarGenerico(v, `${prefijo}.${k}`, out);
		}
	}
}

function recogerSesion(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.sesion, 'M.sesion', e);
	e.push(
		{ clave: 'M.sesion.confirmacionPostSerie(rep)', valor: M.sesion.confirmacionPostSerie(8, 'repeticiones') },
		{ clave: 'M.sesion.confirmacionPostSerie(seg)', valor: M.sesion.confirmacionPostSerie(30, 'segundos') },
		{ clave: 'M.sesion.anuncioSiguienteSerie', valor: M.sesion.anuncioSiguienteSerie(1, 3, 'Flexiones') },
		{ clave: 'M.sesion.progresoEjercicio', valor: M.sesion.progresoEjercicio(1, 3) },
		{ clave: 'M.sesion.progresoSerie', valor: M.sesion.progresoSerie(2, 3) },
		{ clave: 'M.sesion.objetivo(rep)', valor: M.sesion.objetivo(8, 'repeticiones', 2) },
		{ clave: 'M.sesion.objetivo(seg)', valor: M.sesion.objetivo(30, 'segundos', 2) },
		{ clave: 'M.sesion.tituloPostSerie', valor: M.sesion.tituloPostSerie(2, 3) },
		{ clave: 'M.sesion.preguntaEsfuerzo(seg)', valor: M.sesion.preguntaEsfuerzo('segundos') },
		{ clave: 'M.sesion.preguntaEsfuerzo(rep)', valor: M.sesion.preguntaEsfuerzo('repeticiones') },
		{ clave: 'M.sesion.esfuerzoMuchas(seg)', valor: M.sesion.esfuerzoMuchas('segundos') },
		{ clave: 'M.sesion.esfuerzoMuchas(rep)', valor: M.sesion.esfuerzoMuchas('repeticiones') },
		{ clave: 'M.sesion.esfuerzoAlgunas(seg)', valor: M.sesion.esfuerzoAlgunas('segundos') },
		{ clave: 'M.sesion.esfuerzoAlgunas(rep)', valor: M.sesion.esfuerzoAlgunas('repeticiones') },
		{ clave: 'M.sesion.esfuerzoPocas(seg)', valor: M.sesion.esfuerzoPocas('segundos') },
		{ clave: 'M.sesion.esfuerzoPocas(rep)', valor: M.sesion.esfuerzoPocas('repeticiones') },
		{ clave: 'M.sesion.anuncioSerieConDescanso', valor: M.sesion.anuncioSerieConDescanso(2, 3, 5, 10, 60) },
		{ clave: 'M.sesion.anuncioEjercicioCompletado', valor: M.sesion.anuncioEjercicioCompletado('Flexiones', 5, 10, 'Sentadillas') },
		{ clave: 'M.sesion.sugerenciaProgresionPregunta', valor: M.sesion.sugerenciaProgresionPregunta('Flexiones') },
		{ clave: 'M.sesion.anuncioSugerencia', valor: M.sesion.anuncioSugerencia('Flexiones') },
		{ clave: 'M.sesion.anuncioProgresionAplicada', valor: M.sesion.anuncioProgresionAplicada('Flexiones') },
		{ clave: 'M.sesion.tituloComoHacer', valor: M.sesion.tituloComoHacer('Flexiones') },
		{ clave: 'M.sesion.dolorSustitutoTitulo', valor: M.sesion.dolorSustitutoTitulo('Flexiones', 'Fondos') },
		{ clave: 'M.sesion.dolorSustitutoCuerpo', valor: M.sesion.dolorSustitutoCuerpo('hombro') },
		{ clave: 'M.sesion.anuncioContinuarSustituto', valor: M.sesion.anuncioContinuarSustituto('Flexiones') },
		{ clave: 'M.sesion.rachaCierreSemanaCompleta', valor: M.sesion.rachaCierreSemanaCompleta(2) },
		{ clave: 'M.sesion.rachaCierre', valor: M.sesion.rachaCierre(2) },
		{ clave: 'M.sesion.progresoCierre', valor: M.sesion.progresoCierre(2, 3) }
	);
	return e;
}

function recogerComponentes(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.componentes, 'M.componentes', e);
	e.push(
		{ clave: 'M.componentes.cronometro.tiempo', valor: M.componentes.cronometro.tiempo('1 minuto') },
		{ clave: 'M.componentes.temporizador.faltan', valor: M.componentes.temporizador.faltan('30 segundos') },
		{ clave: 'M.componentes.temporizador.contador', valor: M.componentes.temporizador.contador('Descanso', 30) },
		{ clave: 'M.componentes.contadorReps.anuncioPorCiento', valor: M.componentes.contadorReps.anuncioPorCiento(50) },
		{ clave: 'M.componentes.contadorReps.anuncioCantidad', valor: M.componentes.contadorReps.anuncioCantidad(8, 'repeticiones') },
		{ clave: 'M.componentes.progresoOnboarding.pasoDe', valor: M.componentes.progresoOnboarding.pasoDe(2, 5) }
	);
	return e;
}

function recogerConfiguracion(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.configuracion, 'M.configuracion', e);
	e.push(
		{ clave: 'M.configuracion.indice.dolor.enPausa(1)', valor: M.configuracion.indice.dolor.enPausa(1) },
		{ clave: 'M.configuracion.indice.dolor.enPausa(2)', valor: M.configuracion.indice.dolor.enPausa(2) },
		{ clave: 'M.configuracion.indice.dolor.zonasFila', valor: M.configuracion.indice.dolor.zonasFila('muñecas') },
		{ clave: 'M.configuracion.indice.plan.diasFila', valor: M.configuracion.indice.plan.diasFila(4) },
		{ clave: 'M.configuracion.indice.plan.duracionFila', valor: M.configuracion.indice.plan.duracionFila(20) },
		{ clave: 'M.configuracion.indice.plan.duracionCorta', valor: M.configuracion.indice.plan.duracionCorta(20) },
		{ clave: 'M.configuracion.objetivo.avisoAplicado', valor: M.configuracion.objetivo.avisoAplicado('Fuerza') },
		{ clave: 'M.configuracion.dolor.avisoAplicado', valor: M.configuracion.dolor.avisoAplicado('muñecas') },
		{ clave: 'M.configuracion.aspecto.avisoAplicado', valor: M.configuracion.aspecto.avisoAplicado('Oscuro') },
		{ clave: 'M.configuracion.disponibilidad.avisoDias', valor: M.configuracion.disponibilidad.avisoDias(4) },
		{ clave: 'M.configuracion.disponibilidad.avisoDuracion', valor: M.configuracion.disponibilidad.avisoDuracion(20) },
		{ clave: 'M.configuracion.disponibilidad.opcionDias(3)', valor: M.configuracion.disponibilidad.opcionDias(3) },
		{ clave: 'M.configuracion.disponibilidad.opcionDuracion(30)', valor: M.configuracion.disponibilidad.opcionDuracion(30) },
		{ clave: 'M.configuracion.dolor.fechaRevision', valor: M.configuracion.dolor.fechaRevision('01/01/2026') }
	);
	return e;
}

function recogerPerfil(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.perfil, 'M.perfil', e);
	e.push(
		{ clave: 'M.perfil.resumen.diasSemana(1)', valor: M.perfil.resumen.diasSemana(1) },
		{ clave: 'M.perfil.resumen.diasSemana(5)', valor: M.perfil.resumen.diasSemana(5) },
		{ clave: 'M.perfil.resumen.duracion(1m)', valor: M.perfil.resumen.duracion(1) },
		{ clave: 'M.perfil.resumen.duracion(20m)', valor: M.perfil.resumen.duracion(20) },
		{ clave: 'M.perfil.resumen.imcValor', valor: M.perfil.resumen.imcValor(22.5) },
		{ clave: 'M.perfil.resumen.categoriaImc(normal)', valor: M.perfil.resumen.categoriaImc('normal') }
	);
	return e;
}

function recogerNavegacion(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.navegacion, 'M.navegacion', e);
	return e;
}

function recogerInicio(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.inicio, 'M.inicio', e);
	e.push(
		{ clave: 'M.inicio.titulo', valor: M.inicio.titulo(', Juan') },
		{ clave: 'M.inicio.bloqueado', valor: M.inicio.bloqueado('Flexiones', 'hombro') },
		{ clave: 'M.inicio.proximaSesionResumen', valor: M.inicio.proximaSesionResumen('Full body', 3, 600) },
		{ clave: 'M.inicio.patronesSinPool', valor: M.inicio.patronesSinPool('PUSH, PULL') },
		{ clave: 'M.inicio.semana', valor: M.inicio.semana(2) },
		{ clave: 'M.inicio.sinRacha', valor: M.inicio.sinRacha('3 días') }
	);
	return e;
}

function recogerProgreso(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.progreso, 'M.progreso', e);
	e.push(
		{ clave: 'M.progreso.llevasRacha', valor: M.progreso.llevasRacha(2) },
		{ clave: 'M.progreso.mejorRacha', valor: M.progreso.mejorRacha(2) },
		{ clave: 'M.progreso.completaste(1)', valor: M.progreso.completaste(1) },
		{ clave: 'M.progreso.completaste(3)', valor: M.progreso.completaste(3) },
		{ clave: 'M.progreso.eventoZonas', valor: M.progreso.eventoZonas('hombro') },
		{ clave: 'M.progreso.eventoEstado', valor: M.progreso.eventoEstado('Bloqueado') },
		{ clave: 'M.progreso.resumenSesionHistorial', valor: M.progreso.resumenSesionHistorial('01/01/2026', 'Full', 20, false) },
		{ clave: 'M.progreso.resumenSesionHistorial(dolor)', valor: M.progreso.resumenSesionHistorial('01/01/2026', 'Full', 20, true) },
		{ clave: 'M.progreso.lineaHistorial', valor: M.progreso.lineaHistorial('Flexiones', 3, 3, '8, 8, 7') }
	);
	return e;
}

function recogerBiblioteca(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.biblioteca, 'M.biblioteca', e);
	e.push(
		{ clave: 'M.biblioteca.confirmarCambio', valor: M.biblioteca.confirmarCambio('Flexiones') },
		{ clave: 'M.biblioteca.cambioHecho', valor: M.biblioteca.cambioHecho('Flexiones') },
		{ clave: 'M.biblioteca.nivelDeEjercicio', valor: M.biblioteca.nivelDeEjercicio('principiante', false) },
		{ clave: 'M.biblioteca.nivelDeEjercicio(bloqueado)', valor: M.biblioteca.nivelDeEjercicio('principiante', true) },
		{ clave: 'M.biblioteca.lineaNivel', valor: M.biblioteca.lineaNivel('Empuje', 'principiante' as never) },
		{ clave: 'M.biblioteca.bloqueadoPorDolor', valor: M.biblioteca.bloqueadoPorDolor('hombro') },
		{ clave: 'M.biblioteca.bloqueadoPorDolor(null)', valor: M.biblioteca.bloqueadoPorDolor(null) },
		{ clave: 'M.biblioteca.fraseRevision', valor: M.biblioteca.fraseRevision('01/01/2026') },
		{ clave: 'M.biblioteca.anuncioReactivado', valor: M.biblioteca.anuncioReactivado('Flexiones') }
	);
	return e;
}

function recogerAyuda(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.ayuda, 'M.ayuda', e);
	return e;
}

function recogerModal(): Entrada[] {
	const e: Entrada[] = [];
	visitarGenerico(M.modal, 'M.modal', e);
	return e;
}

function recogerConsejos(): Entrada[] {
	return CONSEJOS.map((c) => ({ clave: `Consejo ${c.id}`, valor: c.texto }));
}


// Las tres reglas viven en un solo lugar: con una lista por bloque, las
// copias se separan y una primera persona pasa en verde segun el bloque
// donde caiga.
const PRIMERA_PERSONA = ['ajusto', 'te haré', 'te doy', 'te muestro', 'nuestro', 'nuestra'];

const TIPOGRAFIA = ['—', '“', '”'];

const GLOSARIO: [string, string][] = [
	['quedan', 'el verbo directo, sin perífrasis con quedar'],
	['quedó', 'el verbo directo, sin perífrasis con quedar'],
	['aguant', 'sostener'],
	['selecci', 'elegir'],
	['comenz', 'empezar'],
	['elimin', 'borrar'],
	['anotar', 'escribir'],
	['ingresa', 'escribir'],
	['un poco', 'ligeramente'],
	['arranc', 'empezar'],
	['chequ', 'revisión'],
	['flojo', 'débil'],
	['app', 'la aplicación'],
];

// Lo que NO puede entrar en ninguna lista: "para", que es la preposicion y
// aparece decenas de veces de forma legitima.

// Excepciones al glosario, una por clave y con su motivo. Se declaran aca y
// no se resuelven sacando el termino de la lista: sacarlo apaga la regla
// para toda la aplicacion y nadie se entera.
const EXCEPCIONES: Record<string, string> = {
	// El glosario destierra el VERBO seleccionar, que es lo que hace el
	// usuario al elegir. Este es el ADJETIVO de estado de una pestaña
	// activa, que es la palabra que el lector de pantalla usa de forma
	// nativa para aria-selected. Cambiarla sonaria peor, no mejor.
	'M.navegacion.seleccionada': 'selecci',
};

function revisarBloque(nombre: string, recolectar: () => Entrada[]): void {
	describe(`${nombre} - registro neutro e impersonal`, () => {
		it('no habla en primera persona', () => {
			for (const { clave, valor } of recolectar()) {
				for (const token of PRIMERA_PERSONA) {
					expect(
						contiene(valor, token),
						`clave ${clave} contiene primera persona prohibida "${token}": "${valor}"`
					).toBe(false);
				}
				// La lista de palabras solo caza las que alguien penso en
				// escribir: "armamos" estaba y "eliminamos" se colaba. La
				// primera persona del plural tiene forma propia en espanol, asi
				// que se busca la forma y no el ejemplo. Medido el 26-08-2026:
				// cero coincidencias legitimas en ui.ts y cero en el catalogo.
				expect(
					/[aeio]mos\b/i.test(valor),
					`clave ${clave} habla en primera persona del plural: "${valor}"`
				).toBe(false);
			}
		});

		it('no usa raya larga ni comillas tipográficas dobles', () => {
			for (const { clave, valor } of recolectar()) {
				for (const token of TIPOGRAFIA) {
					expect(
						valor.includes(token),
						`clave ${clave} contiene carácter prohibido "${token}": "${valor}"`
					).toBe(false);
				}
			}
		});

		it('respeta el glosario de términos', () => {
			for (const { clave, valor } of recolectar()) {
				for (const [token, reemplazo] of GLOSARIO) {
					if (EXCEPCIONES[clave] === token) continue;
					expect(
						contiene(valor, token),
						`clave ${clave} usa "${token}", que en esta aplicación se dice "${reemplazo}": "${valor}"`
					).toBe(false);
				}
			}
		});
	});
}

revisarBloque('M.onboarding', recoger);
revisarBloque('M.sesion', recogerSesion);
revisarBloque('M.componentes', recogerComponentes);
revisarBloque('M.configuracion', recogerConfiguracion);
revisarBloque('M.perfil', recogerPerfil);
revisarBloque('M.navegacion', recogerNavegacion);
revisarBloque('M.inicio', recogerInicio);
revisarBloque('M.progreso', recogerProgreso);
revisarBloque('M.biblioteca', recogerBiblioteca);
revisarBloque('M.ayuda', recogerAyuda);
revisarBloque('M.modal', recogerModal);
revisarBloque('Consejos', recogerConsejos);

describe('M.onboarding - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.onboarding.disclaimer.introduccion).toBe('Tu plan usa solo tu peso corporal y no necesita equipo. Antes de empezar, lee este aviso de seguridad.');
		expect(M.onboarding.disclaimer.avisoCuerpo).toBe('Esta aplicación es una guía de entrenamiento con peso corporal y no sustituye la consulta médica. Si tienes una condición de salud, o dudas de si puedes hacer ejercicio, consulta a un profesional antes de empezar.');
		expect(M.onboarding.disclaimer.tecnicaCuerpo).toBe('La aplicación no ve cómo haces cada ejercicio: no usa la cámara ni sensores de movimiento. Cuidar la técnica, y decidir si cambias de variante o vuelves a activar un ejercicio en pausa, depende de ti.');
		expect(M.onboarding.evaluacion.core.introduccion).toContain('«Empezar a contar»');
		expect(M.onboarding.evaluacion.core.introduccion).toContain('«Detener»');
		expect(M.onboarding.evaluacion.core.mensajeInvalidoSegundos).toBe('Escribe cuántos segundos sostuviste, o usa «No puedo sostenerla».');
		expect(M.onboarding.evaluacion.core.preguntaSegundos).toBe('¿Cuántos segundos sostuviste la plancha?');
		expect(M.onboarding.equipamiento.sinAnclaje).toBe('Sin un anclaje no se evalúa la tracción: ese patrón parte del nivel principiante.');
	});
});

describe('M.sesion - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.sesion.sugerenciaProgresionPregunta('Flexiones')).toBe('Flexiones te resulta fácil. ¿Pasas a una variante más exigente en la próxima sesión?');
		expect(M.sesion.dolorSustitutoTitulo('Flexiones', 'Fondos')).toBe('Cambio: Flexiones por Fondos');
		expect(M.sesion.anuncioContinuarSustituto('Flexiones')).toBe('Sigues con Flexiones');
		expect(M.sesion.anuncioProgresionAplicada('Flexiones')).toBe('Flexiones estará en tu próxima sesión.');
		expect(M.sesion.preguntaEsfuerzo('segundos')).toBe('Para ajustar tu plan: ¿cuánto más habrías podido sostener?');
		expect(M.sesion.esfuerzoPocas('segundos')).toBe('Ligeramente más');
		expect(M.sesion.textoReanudar).toBe('La sesión se guardó. Puedes seguir donde estabas o empezar una nueva.');
		expect(M.sesion.avisoChequeo).toBe('Hoy corresponde la revisión semanal. Al terminar cada ejercicio hay una pregunta corta sobre el esfuerzo. Con esa respuesta se ajusta tu plan.');
	});
});

describe('M.componentes - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.componentes.cronometro.detener).toBe('Detener');
		expect(M.componentes.cronometro.tiempo('1 minuto')).toBe('Tiempo: 1 minuto');
		expect(M.componentes.temporizador.faltan('30 segundos')).toBe('Faltan 30 segundos');
		expect(M.componentes.importarRespaldo.etiquetaBoton).toBe('Importar y reemplazar tus datos');
	});
});

describe('M.configuracion - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.configuracion.borrar.avisoBorrar).toBe('Se borrarán todos tus datos');
		expect(M.configuracion.borrarConfirmar.avisoBorrado).toBe('Todos tus datos se borraron');
		expect(M.configuracion.indice.tusDatos.exportarTusDatos).toBe('Exportar tus datos');
		expect(M.configuracion.dolor.fechaRevision('01/01/2026')).toBe('Se te pregunta el 01/01/2026');
		expect(M.configuracion.objetivo.eligeTuObjetivo).toBe('Elige tu objetivo');
		expect(M.configuracion.disponibilidad.eligeLosDias).toBe('Elige los días');
		expect(M.configuracion.indice.pantallaEncendidaAviso.activado).toBe('La pantalla permanece encendida');
		expect(M.configuracion.importar.etiquetaBoton).toBe('Importar y reemplazar tus datos');
	});
});

describe('M.perfil - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.perfil.resumen.diasSemana(1)).toBe('Días por semana: 1');
		expect(M.perfil.resumen.imcNoDisponibleSinAltura).toBe('No disponible. Carga tu altura en el registro para ver el IMC.');
	});
});

describe('M.navegacion - textos que se fijan', () => {
	it('conserva las cadenas acordadas', () => {
		expect(M.navegacion.avisoSalir).toBe('Toca atrás otra vez para salir');
		expect(M.navegacion.navegacionPrincipal).toBe('Navegación principal');
	});
});
