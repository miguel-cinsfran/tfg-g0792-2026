// Mensajes de la interfaz en un solo lugar: aca se edita lo que el
// lector pronuncia y los textos clave de la sesion, sin bucear en los
// componentes. Las entradas con parametros son funciones que devuelven
// el texto final.
//
// Reglas: espanol neutro, sin siglas tecnicas de cara al usuario (la
// palabra "RIR" esta prohibida), numeros en cifras. Los mensajes de
// ERROR viven aparte, en lib/errores/mensajes.ts.

import type { CategoriaImc } from '$lib/salud/imc';
import type { Nivel } from '$lib/motor/schema';
import type { ResultadoEvaluacion, GrupoEvaluable } from '$lib/motor/evaluacion';

export type Unidad = 'repeticiones' | 'segundos';

// Record y no cadena de ternarios: si manana el calculo del IMC gana una
// categoria, el compilador exige el texto en vez de devolver "normal".
const CATEGORIA_IMC: Record<CategoriaImc, string> = {
	bajo_peso: 'bajo peso',
	normal: 'normal',
	sobrepeso: 'sobrepeso',
	obesidad: 'obesidad',
};

// Si se afloja a Record<string, string>, un patron nuevo del motor se
// lee como "undefined" en la frase del punto flojo.
const PATRON_TEXTO: Record<keyof ResultadoEvaluacion['evaluacion_por_patron'], string> = {
	PUSH: 'empujar (flexiones)',
	PULL: 'tirar (remo)',
	LEGS: 'piernas (sentadillas)',
	CORE: 'abdomen (plancha)',
};

// Nombre de cada prueba del alta en la lista del resumen.
const ETIQUETA_GRUPO_PRUEBA: Record<GrupoEvaluable, string> = {
	PUSH: 'Empujar',
	PULL: 'Tirar',
	LEGS: 'Piernas',
	CORE: 'Abdomen',
};

// Sustantivo contable de cada prueba ("12 flexiones", "45 segundos de plancha").
const UNIDAD_PRUEBA: Record<GrupoEvaluable, string> = {
	PUSH: 'flexiones',
	PULL: 'repeticiones de remo',
	LEGS: 'sentadillas',
	CORE: 'segundos de plancha',
};

/** Duracion en segundos a texto en espanol. Minutos exactos: sin "0 segundos". */
export function formatearTiempo(segundos: number): string {
	if (segundos < 60) {
		return `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;
	}
	const mins = Math.floor(segundos / 60);
	const secs = segundos % 60;
	const parteMin = `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
	if (secs === 0) return parteMin;
	const parteSec = `${secs} ${secs === 1 ? 'segundo' : 'segundos'}`;
	return `${parteMin} ${parteSec}`;
}

/** Cantidad con su unidad en espanol neutro. 'segundos' delega en formatearTiempo. */
export function formatearCantidad(n: number, unidad: Unidad): string {
	if (unidad === 'segundos') return formatearTiempo(n);
	return `${n} ${n === 1 ? 'repetición' : 'repeticiones'}`;
}

/** Plural de "semana" en espanol neutro. */
export function formatearSemanas(n: number): string {
	return `${n} ${n === 1 ? 'semana' : 'semanas'}`;
}

/** Plural de "dia" en espanol neutro. */
export function formatearDias(n: number): string {
	return `${n} ${n === 1 ? 'día' : 'días'}`;
}

/** Numero en palabras para la bienvenida a las pruebas (2 a 4). */
const NUMERO_PREGUNTAS: Record<number, string> = {
	2: 'dos',
	3: 'tres',
	4: 'cuatro',
};

/** Decimal con coma para lo visible (IMC). Intl con locale 'es' usa la
coma como separador (MDN: Intl.NumberFormat). */
const FORMATO_DECIMAL_ES = new Intl.NumberFormat('es', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

export const M = {	sesion: {
		botonSerieTerminada: 'Terminar serie',
		botonContinuar: 'Continuar',
		botonComoHacer: 'Cómo se hace',
		botonReportarDolor: 'Reportar dolor',
		botonSaltarDescanso: 'Saltar descanso',
		// Solo "Empezar": el final es automatico, no hay "Parar".
		sostenerEmpezar: 'Empezar',
		sostenerEtiqueta: 'Sosteniendo',

		confirmacionPostSerie: (valor: number, unidad: Unidad) =>
			`Registrado: ${formatearCantidad(valor, unidad)}.`,
		botonAjustarReps: 'Corregir cantidad',
		anuncioSiguienteSerie: (s: number, total: number, nombre: string) =>
			`Serie ${s} de ${total} de ${nombre}.`,
		// Se anuncia al reanudar una sesión que quedó en el descanso: la
		// app se cerró mientras corría y el descanso ya concluyó.
		tiempoDescansoConcluido: 'Tiempo de descanso concluido',

		tituloReanudar: 'Tienes una sesión sin terminar',
		textoReanudar:
			'La sesión se guardó. Puedes seguir donde estabas o empezar una nueva.',
		botonReanudar: 'Seguir donde estabas',
		botonEmpezarDeNuevo: 'Empezar una sesión nueva',
		anuncioReanudada: 'Sesión retomada',

		// Terminar la sesión antes de su final: con series hechas se
		// cierra por el camino normal; sin ellas se descarta sin
		// guardar nada, a propósito.
		botonTerminarSesion: 'Terminar la sesión',
		tituloTerminarSesion: '¿Terminar la sesión ahora?',
		textoTerminarConSeries:
			'Se guarda lo que hiciste hasta aquí y la sesión queda cerrada.',
		textoTerminarSinSeries:
			'Todavía no completaste ninguna serie, así que no se guarda nada.',
		botonConfirmarTerminar: 'Sí, terminar',
		botonSeguirEntrenando: 'Seguir entrenando',
		anuncioSesionDescartada: 'Sesión descartada. No se guardó nada.',

		avisoChequeo:
			'Hoy corresponde la revisión semanal. Al terminar cada ejercicio hay una pregunta corta sobre el esfuerzo. Con esa respuesta se ajusta tu plan.',
		anuncioPatronesSinPool: 'Hoy no hay ejercicios para algunos patrones',

		progresoEjercicio: (n: number, total: number) => `Ejercicio ${n} de ${total}`,
		progresoSerie: (s: number, total: number) => `Serie ${s} de ${total}`,
		objetivo: (cantidad: number, unidad: Unidad, margen: number) => {
			// El margen RIR no aplica a segundos: en un sostener no se
			// mide "reserva", se sostiene lo objetivo.
			if (unidad === 'segundos') {
				return `Sostén ${formatearCantidad(cantidad, unidad)}.`;
			}
			return `Objetivo: ${formatearCantidad(cantidad, unidad)}. No vayas al límite: termina como si pudieras hacer ${margen} más.`;
		},

		tituloPostSerie: (s: number, total: number) => `Serie ${s} de ${total} terminada`,
		preguntaEsfuerzo: (unidad: Unidad) =>
			unidad === 'segundos'
				? 'Para ajustar tu plan: ¿cuánto más habrías podido sostener?'
				: 'Para ajustar tu plan: ¿cuántas más habrías podido hacer?',
		esfuerzoMuchas: (unidad: Unidad) => (unidad === 'segundos' ? 'Mucho más' : 'Muchas más'),
		esfuerzoAlgunas: (unidad: Unidad) => (unidad === 'segundos' ? 'Bastante más' : 'Algunas más'),
		esfuerzoPocas: (unidad: Unidad) => (unidad === 'segundos' ? 'Ligeramente más' : 'Pocas más'),
		esfuerzoNinguna: 'Ninguna más',
		errorPostSerieSinEsfuerzo: 'Elige una opción de esfuerzo para continuar.',

		// Un anuncio por transicion: encadenados se pisan en la region live.
		anuncioSerieConDescanso: (s: number, total: number, g: number, G: number, descanso: number) =>
			`Serie ${s} de ${total} lista. Llevas ${g} de ${G} series en la sesión. Descansa ${formatearCantidad(descanso, 'segundos')}.`,
		anuncioEjercicioCompletado: (nombre: string, g: number, G: number, siguiente: string) =>
			`${nombre} terminado. Llevas ${g} de ${G} series. Sigue con ${siguiente}.`,
		anuncioSesionCompletada: 'Sesión completada',
		anuncioSesionCancelada: 'Sesión interrumpida por dolor',

		sugerenciaProgresionTitulo: 'Conviene subir la dificultad',
		sugerenciaProgresionPregunta: (nombre: string) =>
			`${nombre} te resulta fácil. ¿Pasas a una variante más exigente en la próxima sesión?`,
		sugerenciaProgresionBotonSi: 'Sí, subir',
		sugerenciaProgresionBotonNo: 'Seguir en este nivel',
		sugerenciaProgresionError: 'No se pudo aplicar el cambio. Sigue en el nivel actual por ahora.',
		anuncioSugerencia: (nombre: string) =>
			`Conviene subir la dificultad de ${nombre}.`,
		anuncioProgresionAplicada: (nombre: string) =>
			`${nombre} estará en tu próxima sesión.`,

		titulo: 'Sesión de entrenamiento',
		cargando: 'Cargando...',
		botonVolverInicio: 'Volver al inicio',
		botonVolverIntentar: 'Volver a intentar',
		cerrando: 'Cerrando sesión...',
		botonConfirmar: 'Confirmar',
		botonCancelar: 'Cancelar',
		botonInterrumpirSesion: 'Interrumpir la sesión',
		botonVolverDescanso: 'Volver al descanso',
		botonVolverAlEjercicio: 'Volver al ejercicio',
		botonOmitirPatron: 'Saltar este ejercicio hoy',
		// Polite, no assertive: el foco ya aterriza en el ejercicio
		// siguiente y el lector lo lee; este anuncio llega despues.
		patronOmitido: 'Ejercicio saltado',
		botonRevisarZonas: 'Revisar tus zonas con dolor',
		errorPlanVacio:
			'No hay ejercicios seguros para tus zonas con dolor actuales. Revisa tus zonas para desbloquear ejercicios.',
		errorSinPerfil: 'No hay perfil. Completa el registro para empezar.',
		botonContinuarCambio: 'Continuar con el cambio',
		descansoTitulo: 'Descanso',
		// Lo que viene tras el descanso: la serie siguiente o el final.
		lineaDespues: (nombre: string | null, serie: number, total: number) =>
			nombre === null
				? 'Después: terminas la sesión'
				: `Después: ${nombre}, serie ${serie} de ${total}`,
		botonSumarDescanso: '+30 segundos',
		anuncioDescansoExtendido: (segundos: number) => `Descanso: ${formatearTiempo(segundos)}`,
		corregirTitulo: 'Corregir cantidad',
		ejerciciosHechosTitulo: 'Ejercicios que hiciste',
		proximaSesionTitulo: 'Tu próxima sesión',
		tituloComoHacer: (nombre: string) => `Cómo hacer ${nombre}`,
		dolorZonasLeyenda: 'Marca todas las zonas donde sientes dolor',
		errorSinZonasDolor: 'Marca al menos una zona donde sientes dolor para continuar.',
		dolorSustitutoTitulo: (actual: string, sustituto: string) =>
			`Cambio: ${actual} por ${sustituto}`,
		dolorSustitutoCuerpo: (zonas: string) =>
			`Trabaja el mismo patrón sin pasar por ${zonas}.`,
		anuncioBloqueadoPorDolor: 'Ejercicio bloqueado por dolor',
		anuncioContinuarSustituto: (nombre: string) => `Sigues con ${nombre}`,
		dolorSinReemplazoTitulo: 'No hay otro ejercicio que no cargue esa zona',
		rachaCierreSemanaCompleta: (n: number) =>
			`¡Semana completa! Racha: ${formatearSemanas(n)}`,
		rachaCierre: (n: number) => `Racha: ${formatearSemanas(n)}`,
		progresoCierre: (hechas: number, meta: number) =>
			`Vas ${hechas} de ${formatearDias(meta)} esta semana`,
	},

	ayuda: {
		titulo: 'Ayuda',
		vibracionTitulo: 'Vibraciones',
		vibracionTexto:
			'Una vibración larga marca un cambio: empezó un ejercicio, terminaste una serie o se acabó el descanso. Durante el descanso, tres vibraciones cortas seguidas avisan que faltan 3 segundos: es el momento de ponerte en posición antes de la señal final.',
		chequeoTitulo: 'Revisión semanal',
		chequeoTexto:
			'La primera sesión de la semana pregunta, al final de cada ejercicio, cuántas repeticiones más habrías podido hacer. Con eso se ajusta el plan a tu nivel real. El resto de la semana no te pregunta nada: la idea es molestarte lo menos posible.',
		rachaTitulo: '¿Qué cuenta como racha?',
		rachaTexto:
			'La racha son semanas completas, no días sueltos. Una semana cuenta si entrenas los días que elegiste en tu plan. Cada día vale una vez: entrenar dos veces el mismo día no suma doble. La racha solo sube cuando termina la semana con esos días hechos. Si la semana actual está a medias, las que ya cerraste no se borran. Las sesiones interrumpidas por dolor no cuentan para la meta. En la pantalla de Progreso también ves tu mejor racha, que es la mayor cantidad de semanas seguidas que alcanzaste.',
		sonidosTitulo: 'Sonidos',
		sonidosTexto:
			'Los avisos importantes suenan: cambio de pestaña, al empezar una serie, fin del descanso, sesión completada y racha, entre otros. Desde Perfil puedes apagar los efectos o la música y ajustar el volumen de cada uno por separado.',
		reanudarTitulo: 'Si la aplicación se cierra a mitad de sesión',
		reanudarTexto:
			'La sesión se guarda en tu teléfono a cada paso. Si Android cierra la aplicación o la cierras sin querer, al volver la aplicación te pregunta si sigues donde estabas o empiezas una nueva.',
		nivelTitulo: 'Qué significa tu nivel',
		nivelTexto:
			'Tu nivel sale de tus pruebas: es el que más se repitió entre ellas. El grupo más débil tiene prioridad en tus entrenamientos.',
	},

	modal: {
		// Dos salidas del dialogo con nombres accesibles DISTINTOS: el
		// cierre del encabezado y el "Volver" del pie por defecto. Con
		// el mismo nombre, TalkBack no los distinguiria.
		cerrar: 'Cerrar',
		volver: 'Volver',
	},

	biblioteca: {
		titulo: 'Ejercicios',
		// Cambio de variante: vive en el detalle del ejercicio porque
		// afecta la PROXIMA sesion, no la de hoy.
		tituloVariantes: 'Cambiar de variante',
		botonVarianteDificil: 'Pasar a la variante más difícil desde la próxima sesión',
		botonVarianteFacil: 'Volver a la variante más fácil desde la próxima sesión',
		extremoDificil: 'Ya estás en la variante más difícil de esta cadena.',
		extremoFacil: 'Ya estás en la variante más fácil de esta cadena.',
		confirmarCambio: (nombre: string) =>
			`Pasar a ${nombre}. El cambio se aplica desde la próxima sesión; la de hoy sigue igual.`,
		cambioHecho: (nombre: string) => `${nombre} entra en tu próxima sesión.`,
		nivelDeEjercicio: (nivel: string, bloqueado: boolean) =>
			`Nivel ${nivel}${bloqueado ? ', bloqueado por dolor' : ''}`,
		// Segunda linea cuando el perfil deja el ejercicio fuera: la
		// causa visible y leible por el lector.
		fueraPorAnclaje: 'No entra en tu plan: necesita barra o anclaje',
		fueraPorDolor: (zonas: string) => `No entra en tu plan: carga ${zonas}`,
		// Las frases compuestas viven enteras acá: el lector las recorre
		// de corrido, y partidas nadie puede revisar cómo suenan.
		lineaNivel: (patron: string, nivel: Nivel) => `${patron}, nivel ${nivel}`,
		bloqueadoPorDolor: (razon: string | null) =>
			razon
				? `Este ejercicio está bloqueado por dolor (${razon.toLowerCase()}).`
				: 'Este ejercicio está bloqueado por dolor.',
		fraseRevision: (fecha: string) => `La aplicación te pregunta si mejoró el ${fecha}.`,
		anuncioReactivado: (nombre: string) => `${nombre} habilitado de nuevo`,
		// Reactivación de un ejercicio bloqueado por dolor.
		botonReactivar: 'Reactivar ahora',
		tituloReactivar: 'Reactivar ejercicio',
		confirmarReactivar: 'Vuelve a aparecer en tus sesiones. ¿Confirmas?',
		botonRehabilitar: 'Sí, rehabilitar',
		cancelar: 'Cancelar',
		botonConfirmarCambio: 'Confirmar el cambio',
		// Respaldo del título cuando el id no está en el catálogo.
		tituloRespaldo: 'Ejercicio',
		tituloNoEncontrado: 'Ejercicio no encontrado',
		textoNoEncontrado: 'El ejercicio que pediste no está en el catálogo.',
	},

	progreso: {
		titulo: 'Progreso',
		cargando: 'Cargando...',
		// Racha, sesiones y mejor racha: "Tu mejor racha: N" usa
		// formatearSemanas para que no se lea "1 semanas".
		llevasRacha: (n: number) =>
			`Llevas ${formatearSemanas(n)} seguidas entrenando`,
		mejorRacha: (n: number) => `Tu mejor racha: ${formatearSemanas(n)}`,
		completaste: (n: number) => `Completaste ${n} ${n === 1 ? 'sesión' : 'sesiones'}`,
		mejorRachaTitulo: 'Mejor racha',
		sesionesTitulo: 'Sesiones',
		historialTitulo: 'Historial de sesiones',
		eventosDolorTitulo: 'Eventos de dolor',
		botonIniciarPrimeraSesion: 'Empezar primera sesión',
		eventoZonas: (detalle: string) => `Zonas: ${detalle}`,
		eventoEstado: (detalle: string) => `Estado: ${detalle}`,
		// Fallback cuando el evento de dolor no registro zonas.
		sinDetalle: 'sin detalle',
		// Estados visibles de un evento de dolor en el historial.
		estadoBloqueado: 'Bloqueado',
		estadoResuelto: 'Resuelto',
		sinEventosDolor: 'No hay eventos de dolor registrados.',
		// La duración pasa por formatearTiempo para que no se lea
		// "1 minutos", y el verbo de la cancelación es el mismo que usan
		// el anuncio y el encabezado del cierre de sesión.
		resumenSesionHistorial: (
			fecha: string,
			tipo: string,
			minutos: number,
			canceladaPorDolor: boolean
		) =>
			`${fecha}, ${tipo}, ${formatearTiempo(minutos * 60)}${canceladaPorDolor ? ', interrumpida por dolor' : ''}`,
		// Reemplazo cuando un ejercicio del historial dejó de estar en el
		// catálogo: el id técnico ('ej-001-...') se deletrea sin sentido
		// en lector de pantalla.
		ejercicioNoDisponible: 'Ejercicio no disponible',
		// Línea de un ejercicio del historial. Los valores llegan ya
		// unidos con ", " desde la ruta; sin unidad (no siempre son
		// repeticiones, hay segundos).
		lineaHistorial: (nombre: string, hechas: number, planificadas: number, valores: string) =>
			`${nombre}: ${hechas} de ${planificadas} series. Cada serie: ${valores}`,
		// Estados vacíos del contrato de voz: impersonal y tuteo.
		sinRacha: 'Todavía no tienes racha. Empieza esta semana.',
		sinSesiones: 'Todavía no tienes sesiones. Empieza la primera. Así empieza tu racha.',
	},

	inicio: {
		// El sufijo con el nombre lo arma la ruta; el módulo solo compone.
		titulo: (sufijo: string) => `Tu entrenamiento${sufijo}`,
		cargando: 'Cargando...',
		botonEmpezarEntrenamiento: 'Empezar entrenamiento',
		// Con una sesion guardada, el boton dice a donde lleva: seguir.
		botonEmpezarEntrenamientoSesion: 'Continuar sesión',
		botonCompletarRegistro: 'Completar el registro',
		// Card del bloqueo por dolor.
		ejercicioBloqueadoTitulo: 'Ejercicio bloqueado',
		bloqueado: (ejercicio: string, zona: string) =>
			`Hace 28 días se bloqueó ${ejercicio} por molestia en ${zona}. ¿Cómo está esa zona ahora?`,
		zonaSinDetalle: 'alguna zona',
		botonSinDolor: 'Sin dolor',
		botonSigueMolestando: 'Sigue molestando',
		botonLoDecidoMasTarde: 'Más tarde',
		atencionTitulo: 'Atención',
		atencionTexto: 'Si el dolor sigue, consulta al médico antes de volver a entrenar.',
		proximaSesionTitulo: 'Tu próxima sesión',
		proximaSesionResumen: (tipo: string, ejercicios: number, duracionSegundos: number) =>
			`${tipo}, ${ejercicios} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}, ~${formatearTiempo(duracionSegundos)}`,
		patronesSinPool: (patrones: string) =>
			`Hoy no hay ejercicios de ${patrones} que no carguen una zona con dolor.`,
		progresoTitulo: 'Progreso',
		semanaSinEmpezar: 'Sin empezar',
		semana: (n: number) => `Semana ${n}`,
		sinRacha: (dias: string) => `Todavía no tienes racha. Entrena tus ${dias} esta semana.`,
		anuncioInicioListo: 'Inicio listo',
		anuncioEjercicioHabilitado: 'Ejercicio habilitado de nuevo',
		anuncioRevisionReprogramada:
			'Se reprogramó la revisión en 28 días. Si el dolor sigue, consulta al médico.',
		consejo: {
			titulo: 'Consejo',
		},
	},

	onboarding: {
		indice: {
			titulo: 'Registro',
			cargando: 'Cargando'
		},
		comun: {
			continuar: 'Continuar'
		},
		datos: {
			titulo: 'Tus datos',
			sobreTi: 'Sobre ti',
			medidas: 'Medidas',
			avisoEdad: 'Si tienes 40 años o más, considera una consulta médica previa.',
			errorAlturaCm: 'Escribe tu altura en centímetros, entre 100 y 230, o déjala vacía.'
		},
		objetivo: {
			titulo: 'Tu objetivo',
			leyenda: 'Elige tu objetivo',
			errorSeleccion: 'Elige un objetivo para continuar.'
		},
		dolor: {
			titulo: 'Zonas con dolor previo',
			leyenda: 'Elige las zonas con dolor previo',
			sinDolor: 'Si no te duele nada, sigue adelante sin marcar nada.'
		},
		equipamiento: {
			titulo: 'Equipamiento disponible',
			leyenda: '¿Tienes una barra o un anclaje para suspensión?',
			errorSeleccion: 'Elige una opción para continuar.',
			explicacion:
				'Sirve una barra de dominadas de marco de puerta, unas anillas o una correa de suspensión colgada de un anclaje firme.',
			sinAnclaje:
				'Sin un anclaje no se evalúa la tracción: ese patrón parte del nivel principiante.'
		},
		disponibilidad: {
			titulo: 'Tu disponibilidad',
			leyendaDias: 'Días por semana',
			leyendaDuracion: 'Duración de la sesión',
			errorDias: 'Elige cuántos días por semana.',
			errorDuracion: 'Elige cuánto dura la sesión.'
		},
		disclaimer: {
			titulo: 'Antes de empezar',
			introduccion:
				'Tu plan usa solo tu peso corporal y no necesita equipo. Antes de empezar, lee este aviso de seguridad.',
			avisoTitulo: 'Aviso médico',
			avisoCuerpo:
				'Esta aplicación es una guía de entrenamiento con peso corporal y no sustituye la consulta médica. Si tienes una condición de salud, o dudas de si puedes hacer ejercicio, consulta a un profesional antes de empezar.',
			noEntrenesTitulo: 'No entrenes hoy si tienes:',
			noEntrenesItems: [
				'Dolor intenso de causa desconocida.',
				'Una lesión sin autorización médica para entrenar.',
				'Una afección cardíaca sin control médico.',
				'Mareos o desmayos frecuentes.'
			] as const,
			duranteCuerpo:
				'Durante el entrenamiento, detente si aparece dolor en el pecho, dificultad para respirar, mareo intenso o dolor agudo en una articulación. Si el síntoma continúa, busca atención médica.',
			cerrarCuerpo:
				'El entrenamiento con peso corporal es seguro para la mayoría de las personas. Aun así, tú conoces tu cuerpo mejor que nadie: si algo no se siente bien, detén la sesión.',
			casillaLabel: 'He leído y entiendo el aviso médico.',
			casillaError: 'Marca la casilla para continuar.',
			respaldoTitulo: 'Si ya usabas la aplicación, recupera tu copia de seguridad.',
			respaldoCuerpo: 'Al recuperarla, se reemplazan los datos de esta instalación.',
			respaldoBoton: 'Recuperar mis datos',
			botonContinuar: 'Aceptar y continuar'
		},
		evaluacion: {
			// Lo que comparten los cuatro subpasos: el botón y el rango
			// valen para todos; el bloque de repeticiones, para push,
			// legs y pull. core mide segundos y vive aparte.
			comun: {
				continuar: 'Continuar',
				rangoValido: 'Entero entre 0 y 300.',
				preguntaRepeticiones: '¿Cuántas repeticiones puedes hacer?',
				noPuedoNinguna: 'No puedo hacer ninguna',
				// "No puedo" no navega: anota 0 y manda al Continuar.
				anotadoNinguna: 'Anotado: ninguna. Toca «Continuar» para seguir.',
				tituloConteo: 'Tu conteo',
				mensajeInvalidoRepeticiones:
					'Escribe cuántas repeticiones hiciste, o usa «No puedo hacer ninguna».'
			},
			push: {
				titulo: 'Evaluación: flexiones',
				comoHacer: 'Cómo hacer flexiones',
				// El numero sale de las pruebas que quedan en el orden
				// efectivo: tres sin anclaje, menos las salteadas por
				// dolor. Con una sola, en singular.
				introduccion: (restantes: number) =>
					restantes <= 1
						? 'Última pregunta, y es física: una prueba corta de empujar, tirar, piernas y abdomen. Con tus resultados, las primeras sesiones salen a tu medida. Si un ejercicio no te sale, «No puedo hacer ninguna» también es una respuesta válida, y puedes descansar lo que necesites entre una prueba y otra.'
						: `Últimas ${NUMERO_PREGUNTAS[restantes] ?? restantes} preguntas, y son físicas: una prueba corta de empujar, tirar, piernas y abdomen. Con tus resultados, las primeras sesiones salen a tu medida. Si un ejercicio no te sale, «No puedo hacer ninguna» también es una respuesta válida, y puedes descansar lo que necesites entre una prueba y otra.`
			},
			legs: {
				titulo: 'Evaluación: sentadillas',
				comoHacer: 'Cómo hacer sentadillas'
			},
			pull: {
				titulo: 'Evaluación: remo en suspensión',
				comoHacer: 'Cómo hacer remo en suspensión'
			},
			core: {
				titulo: 'Evaluación: plancha',
				comoHacer: 'Cómo hacer la plancha',
				medicion: 'Medición',
				introduccion:
					'Toca «Empezar a contar»: tienes 5 segundos para ponerte en posición. Cuando ya no puedas sostener la plancha, toca «Detener»: los segundos se registran solos. Si prefieres, puedes escribirlos a mano desplegando «Escribir a mano».',
				anotarAMano: 'Escribir a mano',
				preguntaSegundos: '¿Cuántos segundos sostuviste la plancha?',
				noPuedoSostenerla: 'No puedo sostenerla',
			mensajeInvalidoSegundos:
				'Escribe cuántos segundos sostuviste, o usa «No puedo sostenerla».'
			}
		},
		resumen: {
			titulo: 'Tu resumen',
			botonEmpezar: 'Empezar mi primer entrenamiento',
			botonAyuda: 'Ayuda',
			tituloNivel: 'Tu nivel',
			tituloPruebas: 'Tus pruebas',
			tituloPlan: 'Tu plan',
			tituloPatronReforzar: 'Patrón a reforzar',
			nivel: {
				principiante: 'Principiante',
				intermedio: 'Intermedio',
				avanzado: 'Avanzado'
			},
			patronDebil: (patron: keyof ResultadoEvaluacion['evaluacion_por_patron']) =>
				`Tu punto más débil es ${PATRON_TEXTO[patron]}. Tendrá prioridad en tus entrenamientos.`,
			// El nivel es el que mas se repitio entre las pruebas hechas.
			fraseNivel: (nivel: Nivel, pruebas: number) =>
				pruebas <= 0
					? `Tu nivel es ${nivel}: no hubo pruebas y se parte del nivel inicial.`
					: pruebas === 1
						? `Tu nivel es ${nivel}: es el de tu única prueba.`
						: `Tu nivel es ${nivel}: es el que más se repitió en tus ${NUMERO_PREGUNTAS[pruebas] ?? pruebas} pruebas.`,
			lineaPrueba: (grupo: GrupoEvaluable, valor: number, nivel: Nivel) =>
				`${ETIQUETA_GRUPO_PRUEBA[grupo]}: ${valor} ${UNIDAD_PRUEBA[grupo]}, ${nivel}.`,
			pruebaSalteadaDolor: (grupo: GrupoEvaluable, zonas: string) =>
				`${ETIQUETA_GRUPO_PRUEBA[grupo]}: no se probó por el dolor en ${zonas}.`,
			pruebaSinAnclaje: 'Tirar: no se probó, no tienes barra ni anclaje.',
			fraseFueraPorAnclaje:
				'Tu plan no incluye ejercicios de tirar porque necesitan una barra o un anclaje.',
			fraseFueraPorDolor: (zonas: string) =>
				`Tu plan deja fuera los ejercicios que cargan las zonas con dolor que marcaste: ${zonas}.`,
			planResumen: (dias: number, duracion: string) =>
				`Entrenas ${formatearDias(dias)} por semana en sesiones de ${duracion}.`,
			primeraSesion: (tipo: string, ejercicios: string) =>
				`Tu primera sesión es de ${tipo}: ${ejercicios}.`
		}
	},

	configuracion: {
		// Guardar y Cancelar viven a nivel de dominio: las cuatro
		// pantallas con formulario los comparten sin repetir el literal.
		guardar: 'Guardar',
		cancelar: 'Cancelar',

		indice: {
			titulo: 'Configuración',
			cargando: 'Cargando...',
			completarRegistro: 'Completar el registro',
			// Anuncio al exportar; el mismo texto lo usa config/borrar.
			copiaGuardada: 'Copia guardada',
			// La lista raiz agrupada por seccion, en el orden de la
			// pantalla: el titulo de la seccion y sus filas.
			plan: {
				titulo: 'Tu plan',
				objetivo: 'Objetivo',
				diasPorSemana: 'Días por semana',
				diasFila: (n: number) => `Días por semana: ${n}`,
				duracion: 'Duración',
				duracionFila: (minutos: number) => `Duración: ${formatearTiempo(minutos * 60)}`,
				duracionCorta: (minutos: number) => formatearTiempo(minutos * 60),
				tusDatos: 'Datos personales',
				equipo: 'Equipo',
				equipoValor: (tieneAnclaje: boolean) =>
					tieneAnclaje ? 'Con barra o anclaje' : 'Sin barra ni anclaje'
			},
			sonidoYMusica: {
				titulo: 'Sonido y música',
				efectosYMusica: 'Efectos y música'
			},
			consejos: {
				titulo: 'Consejos',
				mostrar: 'Mostrar consejos',
				anunciar: 'Anunciar el consejo al entrar',
				// aria-label: el lector anuncia etiqueta y estado en un solo gesto.
				mostrarEstado: {
					activado: 'Mostrar consejos: activado',
					desactivado: 'Mostrar consejos: desactivado'
				},
				anunciarEstado: {
					activado: 'Anunciar el consejo al entrar: activado',
					desactivado: 'Anunciar el consejo al entrar: desactivado'
				},
				// Aviso al togglear, patron de "La pantalla permanece encendida".
				mostrarAviso: {
					activado: 'Los consejos aparecen en la portada',
					desactivado: 'Los consejos dejan de aparecer'
				},
				anunciarAviso: {
					activado: 'El consejo se anuncia al entrar',
					desactivado: 'El consejo ya no se anuncia'
				}
			},
			// Estado visible de las filas con interruptor: los toggles de
			// consejos y pantalla encendida muestran 'Activado'/'Desactivado'.
			estado: {
				activado: 'Activado',
				desactivado: 'Desactivado'
			},
			tuEvaluacion: {
				titulo: 'Tu evaluación',
				volverAHacerEvaluacion: 'Volver a hacer la evaluación'
			},
			dolor: {
				titulo: 'Dolor',
				zonasConDolor: 'Zonas con dolor',
				// Primera línea de la fila: las zonas declaradas o ninguna.
				zonasFila: (detalle: string) => `Zonas con dolor: ${detalle}`,
				// Segunda línea, solo si hay ejercicios en pausa por dolor
				// reportado en sesión: singular y plural.
				enPausa: (n: number) => (n === 1 ? '1 ejercicio en pausa' : `${n} ejercicios en pausa`)
			},
			tusDatos: {
				titulo: 'Copia de seguridad',
				exportarTusDatos: 'Exportar tus datos',
				importarDatos: 'Importar datos',
				borrarTodo: 'Borrar todo'
			},
			general: {
				titulo: 'General',
				mantenerPantallaEncendida: 'Mantener la pantalla encendida durante el entrenamiento'
			},
			// El aria-label del interruptor repite el nombre con el
			// estado: el lector anuncia ambos en un solo gesto.
			pantallaEncendida: {
				activado: 'Mantener la pantalla encendida durante el entrenamiento: activado',
				desactivado: 'Mantener la pantalla encendida durante el entrenamiento: desactivado'
			},
			// Anuncio al alternar; la region live dice lo mismo que la fila.
			pantallaEncendidaAviso: {
				activado: 'La pantalla permanece encendida',
				desactivado: 'La pantalla puede apagarse'
			},
			informacion: {
				titulo: 'Información',
				acercaDe: 'Acerca de'
			}
		},

		acerca: {
			titulo: 'Acerca de',
			version: (version: string) => `Versión ${version}`,
			hechaPor: 'Hecha por Miguel Ángel Insfrán Caballero',
			datosLocales:
				'Tus datos no salen del teléfono: la aplicación funciona sin conexión y no envía nada a ningún servidor.'
		},

		objetivo: {
			titulo: 'Objetivo',
			cargando: 'Cargando...',
			eligeTuObjetivo: 'Elige tu objetivo',
			// Elegir aplica al instante: el aviso nombra el valor nuevo.
			avisoAplicado: (etiqueta: string) => `Objetivo: ${etiqueta}`
		},

		aspecto: {
			titulo: 'Aspecto',
			leyenda: 'Elige cómo se ve la aplicación',
			sistemaEtiqueta: 'Según el teléfono',
			sistemaDescripcion: 'Claro u oscuro, igual que el resto del teléfono.',
			claroEtiqueta: 'Claro',
			claroDescripcion: 'Fondo claro y texto oscuro.',
			oscuroEtiqueta: 'Oscuro',
			oscuroDescripcion: 'Fondo oscuro y texto claro. Puede molestar menos si la luz te incomoda.',
			contrasteEtiqueta: 'Alto contraste',
			contrasteDescripcion:
				'Negro, blanco y amarillo, con bordes marcados. Pensado para baja visión.',
			// Elegir aplica al instante: el aviso nombra la opción nueva.
			avisoAplicado: (etiqueta: string) => `Aspecto: ${etiqueta}`
		},

		disponibilidad: {
			eligeLosDias: 'Elige los días',
			duracionSesion: 'Duración de la sesión',
			opcionDias: (n: number) => `${formatearDias(n)} por semana`,
			opcionDuracion: (minutos: number) => `${formatearTiempo(minutos * 60)} por sesión`,
			// Elegir aplica al instante y cierra la ventana: el aviso
			// nombra el valor nuevo, igual que la fila.
			avisoDias: (n: number) => `Días por semana: ${n}`,
			avisoDuracion: (minutos: number) => `Duración: ${formatearTiempo(minutos * 60)}`
		},

		datos: {
			titulo: 'Datos personales',
			cargando: 'Cargando...',
			introduccion:
				'Edita tu nombre, edad, peso y altura. Esos datos se usan para mostrarte el índice de masa corporal; el plan de entrenamiento no cambia.',
			sobreTi: 'Sobre ti',
			medidas: 'Medidas',
			// Etiquetas de los campos del formulario.
			campos: {
				nombre: 'Nombre',
				edad: 'Edad',
				peso: 'Peso',
				altura: 'Altura',
				// Ids tecnicos de aria-describedby: la unidad del campo y
				// su error. Viven aca para que la ruta no tenga cadenas.
				unidadPeso: 'unidad-datos-peso',
				unidadAltura: 'unidad-datos-altura',
				errorNombre: 'error-datos-nombre',
				errorEdad: 'error-datos-edad',
				errorPeso: 'error-datos-peso',
				errorAltura: 'error-datos-altura'
			},
			avisoValidacion: 'Revisa los datos: hay campos con errores.',
			avisoGuardado: 'Datos guardados'
		},

		dolor: {
			titulo: 'Zonas con dolor',
			cargando: 'Cargando...',
			zonasPermanentes: 'Zonas con dolor permanente',
			leyendaZonas: 'Marca las zonas con dolor permanente',
			explicacion:
				'Los ejercicios que exigen estas zonas no entran en tus sesiones. Si una zona mejoró, desmárcala.',
			bloqueadosTitulo: 'Ejercicios bloqueados por dolor',
			sinBloqueados: 'No tienes ejercicios bloqueados.',
			detalleBloqueado: 'Toca un ejercicio para ver el detalle o reactivarlo antes de tiempo.',
			fechaRevision: (fecha: string) => `Se te pregunta el ${fecha}`,
			// Elegir aplica al instante: el aviso nombra las zonas nuevas.
			avisoAplicado: (detalle: string) => `Zonas con dolor: ${detalle}`,
			ninguna: 'ninguna'
		},

		equipamiento: {
			cargando: 'Cargando...'
		},

		audio: {
			titulo: 'Efectos y música',
			efectos: 'Efectos',
			efectosDeSonido: 'Efectos de sonido',
			musicaDeFondo: 'Música de fondo',
			// Titulo del h2 de la seccion de musica; la fila dice "Música de fondo".
			musica: 'Música',
			// Anuncio al togglear: la region live confirma el estado.
			estadoEfectos: {
				activado: 'Efectos activados',
				desactivado: 'Efectos desactivados'
			},
			estadoMusica: {
				activado: 'Música activada',
				desactivado: 'Música desactivada'
			},
			// aria-label del interruptor: nombre y estado en un solo gesto.
			ariaEstadoEfectos: {
				activado: 'Efectos: activados',
				desactivado: 'Efectos: desactivados'
			},
			ariaEstadoMusica: {
				activado: 'Música: activada',
				desactivado: 'Música: desactivada'
			},
			// Estado visible junto al nombre del interruptor.
			estadoVisibleEfectos: {
				activado: 'Activados',
				desactivado: 'Desactivados'
			},
			estadoVisibleMusica: {
				activado: 'Activada',
				desactivado: 'Desactivada'
			},
			// Etiquetas del ContadorReps de cada volumen.
			volumenEfectos: {
				grupo: 'Volumen de efectos',
				menos: 'Bajar volumen de efectos',
				mas: 'Subir volumen de efectos'
			},
			volumenMusica: {
				grupo: 'Volumen de música',
				menos: 'Bajar volumen de música',
				mas: 'Subir volumen de música'
			}
		},

		importar: {
			titulo: 'Importar datos',
			explicacion:
				'Esto reemplaza todos tus datos (perfil, historial, estado de ejercicios y eventos de dolor) por los del archivo. El archivo se valida antes: si no es una exportación válida, no se modifica nada.',
			etiquetaBoton: 'Importar y reemplazar tus datos'
		},

		rehacer: {
			titulo: 'Volver a hacer la evaluación',
			explicacion:
				'Borra tu perfil y tu evaluación y te lleva de nuevo al registro. Tu historial de sesiones se conserva.',
			botonContinuar: 'Continuar'
		},

		rehacerConfirmar: {
			titulo: 'Volver a hacer la evaluación',
			estasSeguro: '¿Estás seguro?',
			noSePuedeDeshacer: 'Esto no se puede deshacer.',
			botonConfirmar: 'Sí, borrar tu perfil y rehacer la evaluación',
			botonConservar: 'No, conservar tu perfil',
			avisoBorrado: 'Perfil borrado'
		},

		borrar: {
			titulo: 'Borrar todo',
			avisoBorrar: 'Se borrarán todos tus datos',
			explicacion:
				'Vas a perder tu perfil, tu historial de sesiones, el estado de tus ejercicios y el historial de dolor. La preferencia de sonido no cambia.',
			sugerenciaExportar: 'Si quieres conservar una copia, exporta tus datos antes de seguir.',
			botonExportarPrimero: 'Exportar primero',
			botonSeguirSinExportar: 'Seguir sin exportar'
		},

		borrarConfirmar: {
			titulo: 'Borrar todo',
			estasSeguro: '¿Estás seguro?',
			explicacion: 'No se puede deshacer. Borra todo y te lleva al registro inicial.',
			botonConfirmar: 'Sí, borrar todo y empezar de cero',
			botonConservar: 'No, conservar tus datos',
			avisoBorrado: 'Todos tus datos se borraron'
		}
	},

	perfil: {
		titulo: 'Perfil',
		cargando: 'Cargando...',
		// Sin perfil la pantalla se reduce al boton de registro.
		sinPerfil: 'Completar el registro',

		resumen: {
			tuPlan: 'Tu plan',
			nombre: 'Nombre:',
			objetivo: 'Objetivo:',
			diasSemana: (n: number) => `Días por semana: ${n}`,
			duracion: (minutos: number) => `Duración: ${formatearTiempo(minutos * 60)}`,
			nivel: 'Nivel:',
			equipo: (tieneAnclaje: boolean) =>
				tieneAnclaje ? 'Equipo: con barra o anclaje' : 'Equipo: sin barra ni anclaje',
			zonasDolor: (zonas: string) => `Zonas con dolor: ${zonas}`,
			zonasDolorNinguna: 'Zonas con dolor: ninguna',
			imcTitulo: 'Índice de masa corporal',
			imcValor: (valor: number) => FORMATO_DECIMAL_ES.format(valor),
			imcCategoria: 'Categoría:',
			categoriaImc: (categoria: CategoriaImc) => CATEGORIA_IMC[categoria],
			imcNoDisponibleSinAltura: 'No disponible. Carga tu altura en el registro para ver el IMC.',
			imcNoDisponibleFaltaAltura: 'No disponible (falta tu altura).',
			imcSalvedad:
				'El IMC es una razón entre tu peso y tu altura, un indicador general. No mide grasa corporal: su relación con la composición real cambia con la edad, la contextura y el origen.',
			botonConfiguracion: 'Configuración'
		}
	},

	navegacion: {
		// Pestanas de la barra inferior y su nombre accesible.
		inicio: 'Inicio',
		ejercicios: 'Ejercicios',
		progreso: 'Progreso',
		perfil: 'Perfil',
		// Sufijo del aria-label de la pestana activa: "Inicio seleccionada".
		seleccionada: ' seleccionada',
		navegacionPrincipal: 'Navegación principal',
		pestania: 'pestaña',
		// Aviso del doble atras y pantalla de error fatal del layout.
		avisoSalir: 'Toca atrás otra vez para salir',
		botonReintentar: 'Volver a intentar',
		tituloError: 'Error'
	},

	componentes: {
		cronometro: {
			empezar: 'Empezar a contar',
			detener: 'Detener',
			// Cuenta atras previa al conteo: 5 s para ponerse en posicion.
			cancelar: 'Cancelar',
			ya: 'Ya',
			cuentaAtras: (n: number) => `Ponte en posición: ${n}`,
			// El tiempo ya viene formateado (formatearTiempo en el
			// componente): aca vive solo el prefijo del anuncio.
			tiempo: (tiempo: string) => `Tiempo: ${tiempo}`
		},
		temporizador: {
			descanso: 'Descanso',
			faltan: (tiempo: string) => `Faltan ${tiempo}`,
			// La linea visible del conteo: etiqueta mas los segundos
			// que restan, tal como se lee (sin pasar por formatearTiempo,
			// que cambia el texto a partir del minuto).
			contador: (etiqueta: string, restantes: number) =>
				`${etiqueta}: ${restantes} segundos`
		},
		contadorReps: {
			grupoRepeticiones: 'Repeticiones',
			grupoSegundos: 'Segundos',
			grupoPorcentaje: 'Porcentaje',
			restarSegundo: 'Restar un segundo',
			sumarSegundo: 'Sumar un segundo',
			restarCincoPorCiento: 'Restar cinco por ciento',
			sumarCincoPorCiento: 'Sumar cinco por ciento',
			quitarRepeticion: 'Quitar una repetición',
			agregarRepeticion: 'Agregar una repetición',
			anuncioPorCiento: (n: number) => `${n} por ciento`,
			anuncioCantidad: (valor: number, unidad: string) => `${valor} ${unidad}`
		},
		importarRespaldo: {
			etiquetaBoton: 'Importar y reemplazar tus datos',
			eligeArchivo: 'Elige primero el archivo de exportación.',
			datosImportados: 'Datos importados',
			etiquetaArchivo: 'Archivo de exportación (.json)'
		},
		botonVolver: {
			atras: 'Atrás'
		},
		barraAccion: {
			accionesPantalla: 'Acciones de la pantalla'
		},
		descripcionEjercicio: {
			posicionInicial: 'Posición inicial',
			ejecucion: 'Ejecución',
			referenciasPropioceptivas: 'Cómo notar que lo haces bien',
			erroresComunes: 'Errores comunes',
			clavesForma: 'Claves de forma y errores comunes'
		},
		progresoOnboarding: {
			pasoDe: (paso: number, total: number) => `Paso ${paso} de ${total}`
		}
	}
} as const;
