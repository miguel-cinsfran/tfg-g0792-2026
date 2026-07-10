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
			`Registramos ${formatearCantidad(valor, unidad)}.`,
		botonAjustarReps: 'Corregir cantidad',
		anuncioSiguienteSerie: (s: number, total: number, nombre: string) =>
			`Serie ${s} de ${total} de ${nombre}.`,

		tituloReanudar: 'Tienes una sesión sin terminar',
		textoReanudar:
			'La sesión quedó guardada. ¿Continuamos donde quedaste o empezamos una nueva?',
		botonReanudar: 'Seguir donde quedaste',
		botonEmpezarDeNuevo: 'Empezar una sesión nueva',
		anuncioReanudada: 'Sesión retomada',

		avisoChequeo:
			'Hoy toca el chequeo de la semana. Al terminar cada ejercicio te haré una pregunta corta sobre el esfuerzo; con eso ajusto tu plan.',

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
			`Serie ${s} de ${total} lista. Vas ${g} de ${G} series en la sesión. Descansa ${formatearCantidad(descanso, 'segundos')}.`,
		anuncioEjercicioCompletado: (nombre: string, g: number, G: number, siguiente: string) =>
			`${nombre} terminado. Llevas ${g} de ${G} series. Sigue con ${siguiente}.`,
		anuncioSesionCompletada: 'Sesión completada',
		anuncioSesionCancelada: 'Sesión cortada por dolor',

		sugerenciaProgresionTitulo: 'Te sugiero subir la dificultad',
		sugerenciaProgresionPregunta: (nombre: string) =>
			`${nombre} te está quedando fácil. ¿Subimos a una variante más exigente para la próxima sesión?`,
		sugerenciaProgresionBotonSi: 'Sí, subir',
		sugerenciaProgresionBotonNo: 'Quedarme aquí',
		sugerenciaProgresionError: 'No pude aplicar el cambio. Prueba quedarte donde estás por ahora.',
		anuncioSugerencia: (nombre: string) =>
			`Te sugiero subir la dificultad de ${nombre}.`,
		anuncioProgresionAplicada: (nombre: string) =>
			`Listo. ${nombre} entra en juego desde tu próxima sesión.`,
	},

	ayuda: {
		titulo: 'Cómo te avisa la app',
		vibracionTitulo: 'Vibraciones',
		vibracionTexto:
			'Una vibración larga marca un cambio: arrancó un ejercicio, terminaste una serie o se acabó el descanso. Durante el descanso, tres vibraciones cortas seguidas avisan que faltan 3 segundos: es el momento de ponerte en posición antes de la señal final.',
		chequeoTitulo: 'Chequeo semanal',
		chequeoTexto:
			'La primera sesión de la semana pregunta, al final de cada ejercicio, cuántas repeticiones más habrías podido hacer. Con eso ajusto el plan a tu nivel real. El resto de la semana no te pregunto nada: la idea es molestarte lo menos posible.',
		rachaTitulo: '¿Qué cuenta como racha?',
		rachaTexto:
			'La racha son semanas completas, no días sueltos. Una semana cuenta si entrenas los días que elegiste en tu plan. Cada día vale una vez: entrenar dos veces el mismo día no suma doble. La racha solo sube cuando termina la semana con esos días hechos. Si la semana actual está a medias, las que ya cerraste no se borran. Las sesiones cortadas por dolor no cuentan para la meta. En la pantalla de Racha también ves tu mejor racha, que es la mayor cantidad de semanas seguidas que alcanzaste.',
		sonidosTitulo: 'Sonidos',
		sonidosTexto:
			'Los avisos importantes suenan: cambio de pestaña, inicio de serie, fin del descanso, sesión completada y racha, entre otros. En Perfil, dentro de "Sonido y música", puedes apagar los efectos o la música y ajustar el volumen de cada uno por separado.',
		reanudarTitulo: 'Si la app se cierra a mitad de sesión',
		reanudarTexto:
			'La sesión se guarda en tu teléfono a cada paso. Si Android cierra la app o la cierras sin querer, al volver a entrar la sesión te pregunta si sigues donde estabas o empiezas una nueva.',
	},

	biblioteca: {
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
	},
} as const;
