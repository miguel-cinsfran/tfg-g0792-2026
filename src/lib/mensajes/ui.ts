// Mensajes de la interfaz en un solo lugar: aca se edita lo que el
// lector pronuncia y los textos clave de la sesion, sin bucear en los
// componentes. Las entradas con parametros son funciones que devuelven
// el texto final.
//
// Reglas: espanol neutro, sin siglas tecnicas de cara al usuario (la
// palabra "RIR" esta prohibida), numeros en cifras. Los mensajes de
// ERROR viven aparte, en lib/errores/mensajes.ts.

export type Unidad = 'repeticiones' | 'segundos';

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

export const M = {
	sesion: {
		botonSerieTerminada: 'Terminar serie',
		botonContinuar: 'Continuar',
		botonComoHacer: 'Cómo se hace',
		botonReportarDolor: 'Reportar dolor',
		botonSaltarDescanso: 'Saltar descanso',
		// Solo "Empezar": el final es automatico, no hay "Parar".
		sostenerEmpezar: 'Empezar',
		sostenerEtiqueta: 'Sosteniendo',

		confirmacionPostSerie: (valor: number, unidad: Unidad) =>
			`Quedó registrado: ${formatearCantidad(valor, unidad)}.`,
		botonAjustarReps: 'Corregir cantidad',
		anuncioSiguienteSerie: (s: number, total: number, nombre: string) =>
			`Serie ${s} de ${total} de ${nombre}.`,

		tituloReanudar: 'Tienes una sesión sin terminar',
		textoReanudar:
			'La sesión quedó guardada. ¿Sigues donde quedaste o empiezas una nueva?',
		botonReanudar: 'Seguir donde quedaste',
		botonEmpezarDeNuevo: 'Empezar una sesión nueva',
		anuncioReanudada: 'Sesión retomada',

		avisoChequeo:
			'Hoy toca el chequeo de la semana. Al terminar cada ejercicio hay una pregunta corta sobre el esfuerzo; con eso se ajusta tu plan.',

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
		cuantasHiciste: (unidad: Unidad) =>
			unidad === 'segundos' ? '¿Cuántos segundos sostuviste?' : '¿Cuántas repeticiones hiciste?',
		preguntaEsfuerzo: (unidad: Unidad) =>
			unidad === 'segundos'
				? 'Para ajustar tu plan: ¿cuánto más habrías aguantado?'
				: 'Para ajustar tu plan: ¿cuántas más habrías podido hacer?',
		esfuerzoMuchas: (unidad: Unidad) => (unidad === 'segundos' ? 'Mucho más' : 'Muchas más'),
		esfuerzoAlgunas: (unidad: Unidad) => (unidad === 'segundos' ? 'Bastante más' : 'Algunas más'),
		esfuerzoPocas: (unidad: Unidad) => (unidad === 'segundos' ? 'Un poco más' : 'Pocas más'),
		esfuerzoNinguna: 'Nada, llegué al tope',
		errorPostSerieSinEsfuerzo: 'Elige cuánto esfuerzo te quedó para continuar.',

		// Un anuncio por transicion: encadenados se pisan en la region live.
		anuncioSerieConDescanso: (s: number, total: number, g: number, G: number, descanso: number) =>
			`Serie ${s} de ${total} lista. Llevas ${g} de ${G} series en la sesión. Descansa ${formatearCantidad(descanso, 'segundos')}.`,
		anuncioEjercicioCompletado: (nombre: string, g: number, G: number, siguiente: string) =>
			`${nombre} terminado. Llevas ${g} de ${G} series. Sigue con ${siguiente}.`,
		anuncioSesionCompletada: 'Sesión completada',
		anuncioSesionCancelada: 'Sesión interrumpida por dolor',

		sugerenciaProgresionTitulo: 'Conviene subir la dificultad',
		sugerenciaProgresionPregunta: (nombre: string) =>
			`${nombre} te está quedando fácil. ¿Subes a una variante más exigente para la próxima sesión?`,
		sugerenciaProgresionBotonSi: 'Sí, subir',
		sugerenciaProgresionBotonNo: 'Quedarme aquí',
		sugerenciaProgresionError: 'No se pudo aplicar el cambio. Prueba quedarte donde estás por ahora.',
		anuncioSugerencia: (nombre: string) =>
			`Conviene subir la dificultad de ${nombre}.`,
		anuncioProgresionAplicada: (nombre: string) =>
			`Listo. ${nombre} entra en juego desde tu próxima sesión.`,

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
		botonOmitirPatron: 'Omitir este patrón hoy',
		botonRevisarZonas: 'Revisar mis zonas con dolor',
		errorPlanVacio:
			'No hay ejercicios seguros para tus zonas con dolor actuales. Revisa tus zonas para desbloquear ejercicios.',
		botonContinuarCambio: 'Continuar con el cambio',
		descansoTitulo: 'Descanso',
		ejerciciosHechosTitulo: 'Ejercicios que hiciste',
		proximaSesionTitulo: 'Tu próxima sesión',
		tituloComoHacer: (nombre: string) => `Cómo hacer ${nombre}`,
		dolorZonasTitulo: 'Zonas con dolor',
		dolorZonasLeyenda: 'Marca todas las zonas donde sientes dolor',
		dolorSustitutoTitulo: (actual: string, sustituto: string) =>
			`Cambiamos ${actual} por ${sustituto}`,
		dolorSustitutoCuerpo: (zonas: string) =>
			`Trabaja el mismo patrón sin pasar por ${zonas}.`,
		dolorSinReemplazoTitulo: 'No hay un reemplazo seguro',
		rachaCierreSemanaCompleta: (n: number) =>
			`¡Semana completa! Racha: ${formatearSemanas(n)}`,
		rachaCierre: (n: number) => `Racha: ${formatearSemanas(n)}`,
		progresoCierre: (hechas: number, meta: number) =>
			`Vas ${hechas} de ${formatearDias(meta)} esta semana`,
	},

	ayuda: {
		titulo: 'Cómo te avisa la app',
		vibracionTitulo: 'Vibraciones',
		vibracionTexto:
			'Una vibración larga marca un cambio: comenzó un ejercicio, terminaste una serie o se acabó el descanso. Durante el descanso, tres vibraciones cortas seguidas avisan que faltan 3 segundos: es el momento de ponerte en posición antes de la señal final.',
		chequeoTitulo: 'Chequeo semanal',
		chequeoTexto:
			'La primera sesión de la semana pregunta, al final de cada ejercicio, cuántas repeticiones más habrías podido hacer. Con eso se ajusta el plan a tu nivel real. El resto de la semana no te pregunta nada: la idea es molestarte lo menos posible.',
		rachaTitulo: '¿Qué cuenta como racha?',
		rachaTexto:
			'La racha son semanas completas, no días sueltos. Una semana cuenta si entrenas los días que elegiste en tu plan. Cada día vale una vez: entrenar dos veces el mismo día no suma doble. La racha solo sube cuando termina la semana con esos días hechos. Si la semana actual está a medias, las que ya cerraste no se borran. Las sesiones interrumpidas por dolor no cuentan para la meta. En la pantalla de Progreso también ves tu mejor racha, que es la mayor cantidad de semanas seguidas que alcanzaste.',
		sonidosTitulo: 'Sonidos',
		sonidosTexto:
			'Los avisos importantes suenan: cambio de pestaña, inicio de serie, fin del descanso, sesión completada y racha, entre otros. Desde Perfil puedes apagar los efectos o la música y ajustar el volumen de cada uno por separado.',
		reanudarTitulo: 'Si la app se cierra a mitad de sesión',
		reanudarTexto:
			'La sesión se guarda en tu teléfono a cada paso. Si Android cierra la app o la cierras sin querer, al volver a entrar la sesión te pregunta si sigues donde estabas o empiezas una nueva.',
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
		cambioHecho: (nombre: string) => `Listo. ${nombre} entra en tu próxima sesión.`,
		nivelDeEjercicio: (nivel: string, bloqueado: boolean) =>
			`Nivel ${nivel}${bloqueado ? ', bloqueado por dolor' : ''}`,
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
		botonIniciarPrimeraSesion: 'Iniciar primera sesión',
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
		sinSesiones: 'Todavía no tienes sesiones. Empieza la primera y comienza tu racha.',
	},

	inicio: {
		// El sufijo con el nombre lo arma la ruta; el módulo solo compone.
		titulo: (sufijo: string) => `Tu entrenamiento${sufijo}`,
		cargando: 'Cargando...',
		botonEmpezarEntrenamiento: 'Empezar entrenamiento',
		botonCompletarRegistro: 'Completar el registro',
		// Card del bloqueo por dolor.
		ejercicioBloqueadoTitulo: 'Ejercicio bloqueado',
		bloqueado: (ejercicio: string, zona: string) =>
			`Hace 28 días se bloqueó ${ejercicio} por molestia en ${zona}. ¿Cómo está esa zona ahora?`,
		zonaSinDetalle: 'alguna zona',
		botonSinDolor: 'Sin dolor, me recuperé',
		botonSigueMolestando: 'Sigue molestando',
		botonLoDecidoMasTarde: 'Lo decido más tarde',
		atencionTitulo: 'Atención',
		atencionTexto: 'Si el dolor sigue, consulta al médico antes de volver a entrenar.',
		proximaSesionTitulo: 'Tu próxima sesión',
		proximaSesionResumen: (tipo: string, ejercicios: number, duracionSegundos: number) =>
			`${tipo}, ${ejercicios} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}, ~${formatearTiempo(duracionSegundos)}`,
		patronesSinPool: (patrones: string) =>
			`Hoy no hay ejercicios disponibles para algunos patrones (${patrones}).`,
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
		disclaimer: {
			titulo: 'Antes de empezar',
			introduccion:
				'Hola. En unos minutos armamos tu plan, a tu medida y sin equipo. Primero, algo para cuidarte.',
			avisoTitulo: 'Aviso médico',
			avisoCuerpo:
				'Esta app te ayuda a entrenar con tu peso; no reemplaza al médico. Si tienes alguna condición de salud o dudas sobre si puedes hacer ejercicio, consulta con un profesional antes de arrancar.',
			noArranquesTitulo: 'No arranques hoy si tienes:',
			noArranquesItems: [
				'Dolor fuerte que todavía no sabes a qué se debe.',
				'Una lesión activa sin el visto bueno de un médico.',
				'Problemas del corazón sin controlar.',
				'Mareos o desmayos seguidos.'
			] as const,
			duranteCuerpo:
				'Mientras entrenas, si sientes dolor en el pecho, te cuesta mucho respirar, te mareas fuerte o aparece un dolor agudo en una articulación, detente. Si no se pasa, busca atención médica.',
			cerrarCuerpo:
				'Entrenar con tu peso es seguro para la mayoría, pero nadie conoce tu cuerpo como tú: si algo no se siente bien, corta.',
			casillaLabel:
				'Leí y entiendo: sé que tengo que consultar al médico si tengo dudas y parar si siento dolor anormal.',
			casillaError: 'Marca la casilla para continuar.',
			respaldoTitulo: '¿Ya usabas la app? Recuperar una copia de seguridad',
			respaldoCuerpo:
				'Si tienes una copia de seguridad, puedes recuperarla ahora. Reemplaza cualquier dato de esta instalación.',
			respaldoBoton: 'Recuperar mis datos',
			botonContinuar: 'Aceptar y continuar'
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
				diasYDuracion: 'Días y duración',
				misDatos: 'Mis datos'
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
				// Aviso al togglear, patron de "La pantalla queda encendida".
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
				// Conteo de bloqueados de la fila: singular/plural segun n.
				bloqueado: (n: number) => (n === 1 ? 'bloqueado' : 'bloqueados')
			},
			tusDatos: {
				titulo: 'Tus datos',
				exportarMisDatos: 'Exportar mis datos',
				importarDatos: 'Importar datos',
				borrarTodo: 'Borrar todo'
			},
			general: {
				titulo: 'General',
				mantenerPantallaEncendida: 'Mantener la pantalla encendida'
			},
			// El aria-label del interruptor repite el nombre con el
			// estado: el lector anuncia ambos en un solo gesto.
			pantallaEncendida: {
				activado: 'Mantener la pantalla encendida: activado',
				desactivado: 'Mantener la pantalla encendida: desactivado'
			},
			// Anuncio al alternar; la region live dice lo mismo que la fila.
			pantallaEncendidaAviso: {
				activado: 'La pantalla queda encendida',
				desactivado: 'La pantalla puede apagarse'
			},
			informacion: {
				titulo: 'Información'
			}
		},

		objetivo: {
			titulo: 'Objetivo',
			cargando: 'Cargando...',
			seleccionaTuObjetivo: 'Selecciona tu objetivo',
			avisoGuardado: 'Objetivo guardado'
		},

		disponibilidad: {
			titulo: 'Días y duración',
			cargando: 'Cargando...',
			seleccionaLosDias: 'Selecciona los días',
			duracionSesion: 'Duración de la sesión',
			opcionDias: (n: number) => `${formatearDias(n)} por semana`,
			opcionDuracion: (minutos: number) => `${formatearTiempo(minutos * 60)} por sesión`,
			avisoGuardado: 'Disponibilidad guardada'
		},

		datos: {
			titulo: 'Mis datos',
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
			avisoValidacion: 'Revisa los datos: hay campos por completar.',
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
			avisoGuardado: 'Zonas guardadas'
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
				'Esto reemplaza TODOS tus datos (perfil, historial, estado de ejercicios y eventos de dolor) por los del archivo. El archivo se valida antes: si no es una exportación válida, no se modifica nada.',
			etiquetaBoton: 'Importar y reemplazar mis datos'
		},

		rehacer: {
			titulo: 'Volver a hacer la evaluación',
			explicacion:
				'Borra tu perfil y tu evaluación y te lleva de nuevo al registro. Tu historial de sesiones queda como está.',
			botonContinuar: 'Continuar'
		},

		rehacerConfirmar: {
			titulo: 'Volver a hacer la evaluación',
			estasSeguro: '¿Estás seguro?',
			noSePuedeDeshacer: 'Esto no se puede deshacer.',
			botonConfirmar: 'Sí, borrar mi perfil y rehacer la evaluación',
			botonConservar: 'No, conservar mi perfil',
			avisoBorrado: 'Perfil eliminado'
		},

		borrar: {
			titulo: 'Borrar todo',
			vamosABorrar: 'Vamos a borrar todos tus datos',
			explicacion:
				'Vas a perder tu perfil, tu historial de sesiones, el estado de tus ejercicios y el historial de dolor. La preferencia de sonido queda igual.',
			sugerenciaExportar: 'Si quieres conservar una copia, exporta tus datos antes de seguir.',
			botonExportarPrimero: 'Exportar primero',
			botonSeguirSinExportar: 'Seguir sin exportar'
		},

		borrarConfirmar: {
			titulo: 'Borrar todo',
			estasSeguro: '¿Estás seguro?',
			explicacion: 'No se puede deshacer. Borra todo y te lleva al registro inicial.',
			botonConfirmar: 'Sí, borrar todo y empezar de cero',
			botonConservar: 'No, conservar mis datos',
			avisoBorrado: 'Borramos todos tus datos'
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
			diasSemana: (n: number) => `Entrenas ${formatearDias(n)} por semana.`,
			duracionSesion: (formateado: string) =>
				formateado.startsWith('1 ')
					? `Sesión de ${formateado}.`
					: `Sesiones de ${formateado}.`,
			nivel: 'Nivel:',
			imcTitulo: 'Índice de masa corporal',
			imcValor: (valor: number) => `${valor.toFixed(1)}`,
			imcCategoria: 'Categoría:',
			imcNoDisponibleSinAltura: 'No disponible. Carga tu altura en el registro para ver el IMC.',
			imcNoDisponibleFaltaAltura: 'No disponible (falta tu altura).',
			imcSalvedad:
				'El IMC es una razón entre tu peso y tu altura, un indicador general. No mide grasa corporal: su relación con la composición real cambia con la edad, la contextura y el origen.',
			botonAyuda: 'Ayuda',
			botonConfiguracion: 'Configuración'
		}
	}
} as const;
