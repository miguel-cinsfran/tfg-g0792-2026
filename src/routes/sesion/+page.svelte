<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { obtenerEstadosTodos, bloquearEjercicio } from '$lib/db/estado';
	import { obtenerHistorial, obtenerUltimaSesion } from '$lib/db/sesiones';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite, anunciarAssertive } from '$lib/a11y/live-region';
	import { mensajePara } from '$lib/errores/mensajes';
	import { M } from '$lib/mensajes/ui';
	import { elegirSplit, determinarTipoSesion } from '$lib/motor/split';
	import { generarSesion } from '$lib/motor/generador';
	import { calcularRacha } from '$lib/motor/racha';
	import { esSesionDeChequeo } from '$lib/motor/chequeo';
	import { buscarSustituto } from '$lib/motor/dolor';
	import { obtenerVistaPrevia, type VistaPrevia } from '$lib/motor/vista-previa';
	import { evaluarProgresionesSugeridas, type SugerenciaProgresion } from '$lib/motor/progresion-sugerida';
	import { progresar } from '$lib/motor/progresion';
	import { rules } from '$lib/motor/reglas';
	import { contarProgresoSemana, type ProgresoSemanal } from '$lib/ui/progreso-semanal';
	import { formatearTiempo } from '$lib/mensajes/ui';
	import { guardarEstado } from '$lib/db/estado';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { etiquetaTipoSesion, etiquetaZona } from '$lib/catalogo/etiquetas';
	import { vibrar } from '$lib/haptica/vibrar';
	import { sonar, precargar } from '$lib/sonido/reproducir';
	import { reproducirSesion, reproducirFondo } from '$lib/sonido/musica';
	import { anunciarError } from '$lib/errores/anunciar';
	import {
		obtenerSesion,
		comenzar,
		restaurar,
		completarSerie,
		corregirUltimaSerie,
		siguienteEjercicio,
		registrarDolor,
		sustituir,
		cancelar,
		cerrar,
	} from '$lib/stores/sesion.svelte';
	import { obtenerSesionEnCurso, borrarSesionEnCurso } from '$lib/db/sesion-en-curso';
	import type { SesionEnCursoGuardada } from '$lib/db/db';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Card from '$lib/components/Card.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import ContadorReps from '$lib/components/ContadorReps.svelte';
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import GrupoSeleccionMultiple from '$lib/components/GrupoSeleccionMultiple.svelte';
	import Temporizador from '$lib/components/Temporizador.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import CirculoCheque from '$lib/components/iconos/CirculoCheque.svelte';
	import Informacion from '$lib/components/iconos/Informacion.svelte';
	import Alerta from '$lib/components/iconos/Alerta.svelte';
	import Saltar from '$lib/components/iconos/Saltar.svelte';
	import Medalla from '$lib/components/iconos/Medalla.svelte';
	import Reloj from '$lib/components/iconos/Reloj.svelte';
	import Cronometro from '$lib/components/iconos/Cronometro.svelte';
	import { ZONAS } from '$lib/motor/schema';
	import type { SesionCompletada, Ejercicio, EstadoEjercicio, EjercicioPlanificado, Zona } from '$lib/motor/schema';
	import {
		siguienteSubvista,
		armarEventoCerrarSerie,
		type Evento,
		type Subvista as SubvistaMaquina,
		type Contexto,
		type OrigenDolor,
	} from '$lib/sesion/fases';

	// Foco al nombre del ejercicio (no al h1 generico, que no dice cual sigue).
	let refEjercicio = $state<HTMLElement>();
	// Foco al h1 de la pantalla cuando la generacion de sesion falla: ese
	// bloque no tiene fase propia, asi que no lo cubre el efecto de abajo.
	let refTitulo = $state<HTMLElement>();
	// El sosten es un estado interno de EJERCICIO (no una fase de la
	// maquina): este h2 solo-lector nombra lo que empieza al pulsar
	// "Empezar", sin duplicar el texto visible del Temporizador.
	let refSosten = $state<HTMLElement>();
	// Una ref por fase: el foco aterriza en el h2 que nombra la subvista.
	let refReanudar = $state<HTMLElement>();
	let refPostSerieTitulo = $state<HTMLElement>();
	let refDescanso = $state<HTMLElement>();
	let refDolorZonas = $state<HTMLElement>();
	let refDolorSustituto = $state<HTMLElement>();
	let refDolorPool = $state<HTMLElement>();
	let refCierre = $state<HTMLElement>();
	let subvista = $state<SubvistaMaquina>('EJERCICIO');
	// undefined = aun no se consulto el respaldo; null = no hay.
	let respaldo = $state<SesionEnCursoGuardada | null | undefined>(undefined);
	let repsReales = $state(0);
	let ajustando = $state(false);
	// En DESCANSO, reemplaza el Temporizador por un Contador para corregir
	// la ultima serie. Al confirmar, vuelve al descanso.
	let modoAjusteDescanso = $state(false);
	let rirSeleccionado: string | null = $state(null);
	let errorEsfuerzo: string | null = $state(null);
	let errorGeneracion = $state<string | null>(null);
	let modalAbierto = $state(false);
	let completada = $state<SesionCompletada | null>(null);
	let cerrando = $state(false);
	let errorCerrar = $state<string | null>(null);
	let rachaCierre = $state<number | null>(null);
	let vistaPreviaCierre = $state<VistaPrevia | null>(null);
	// Progreso de la semana en curso al cierre, calculado con historial fresco.
	let progresoCierre = $state<ProgresoSemanal | null>(null);
	let zonasDolor = $state<Zona[]>([]);
	let reportandoDolor = $state(false);
	let errorDolor = $state<string | null>(null);
	let sustitutoPropuesto = $state<Ejercicio | null>(null);
	// false = boton "Empezar"; true = Temporizador corriendo.
	let sosteniendo = $state(false);
	// null = no se calcularon (sesion no fue de chequeo o no se cerro).
	let sugerenciasProgresion = $state<SugerenciaProgresion[] | null>(null);
	let indiceSugerencia = $state(0);
	let aplicandoSugerencia = $state(false);
	let errorSugerencia = $state<string | null>(null);
	let refTituloSugerencia = $state<HTMLElement>();
	// El bloqueo persistente sale UNA vez por reporte.
	let dolorYaBloqueado = false;
	// Desde donde se abrio el reporte de dolor: cancelar vuelve ahi;
	// null fuera del flujo (invariante que mantiene transicionar). Si
	// fue el descanso, el temporizador rearranca completo (no hay
	// registro del restante); preferible a darlo por terminado.
	let origenDolor = $state<OrigenDolor | null>(null);
	let estadosParaSustituir: EstadoEjercicio[] | null = null;

	let perfil = $state<Awaited<ReturnType<typeof obtenerPerfil>> | null | undefined>(undefined);
	let estados = $state<Awaited<ReturnType<typeof obtenerEstadosTodos>> | undefined>(undefined);
	let historial = $state<Awaited<ReturnType<typeof obtenerHistorial>> | undefined>(undefined);
	// null = sin sesiones; undefined = cargando.
	let ultimaSesion = $state<Awaited<ReturnType<typeof obtenerUltimaSesion>> | null | undefined>(undefined);

	$effect(() => {
		const sub = liveQuery(() => obtenerPerfil()).subscribe({
			next: (v) => { perfil = v ?? null; },
			error: (e) => { errorGeneracion = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosTodos()).subscribe({
			next: (v) => { estados = v; },
			error: (e) => { errorGeneracion = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerHistorial()).subscribe({
			next: (v) => { historial = v; },
			error: (e) => { errorGeneracion = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerUltimaSesion()).subscribe({
			next: (v) => { ultimaSesion = v ?? null; },
			error: (e) => { errorGeneracion = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	// Respaldo: se consulta UNA vez al entrar. Si la lectura falla, seguimos
	// como si no hubiera.
	$effect(() => {
		obtenerSesionEnCurso(Date.now()).then(
			(r) => {
				respaldo = obtenerSesion() === null ? r : null;
				if (respaldo !== null) subvista = 'REANUDAR';
			},
			() => {
				respaldo = null;
			},
		);
	});

	// Pista de sesion al entrar, fondo al salir. Sin dependencias
	// reactivas, asi que el cleanup corre solo en unmount.
	$effect(() => {
		reproducirSesion();
		return () => {
			reproducirFondo();
		};
	});

	// Punto unico de consumo de la maquina: los handlers hacen su I/O
	// (Dexie, anuncios, sonido, haptica) y esta decide la fase siguiente.
	function transicionar(evento: Evento): void {
		const contexto: Contexto = { origenDolor };
		const resultado = siguienteSubvista(subvista, evento, contexto);
		if (resultado.tipo === 'ir-a') {
			subvista = resultado.subvista;
			if (evento.tipo === 'abrirDolor') {
				origenDolor = evento.desde;
			} else if (esSalidaDelFlujoDolor(evento)) {
				origenDolor = null;
			}
		} else if (resultado.tipo === 'error') {
			// Hoy no se produce desde el cableado; si ocurre, no navega.
		}
	}

	function esSalidaDelFlujoDolor(evento: Evento): boolean {
		// omitirPatron sale del flujo solo si no hay sustituto; si lo
		// hay, ya lo absorbio confirmarZonas.
		return (
			evento.tipo === 'cancelarDolorZonas' ||
			evento.tipo === 'continuarSustituto' ||
			evento.tipo === 'interrumpirPorDolor' ||
			(evento.tipo === 'omitirPatron' && sustitutoPropuesto === null)
		);
	}

	function manejarReanudar() {
		if (!respaldo) return;
		const s = respaldo.sesion;
		restaurar(s);
		respaldo = null;
		anunciarPolite(M.sesion.anuncioReanudada);
		vibrar('inicio');
		sonar('inicio-serie');
		transicionar({ tipo: 'reanudar' });
	}

	async function manejarEmpezarDeNuevo() {
		respaldo = null;
		await borrarSesionEnCurso();
		transicionar({ tipo: 'empezarNueva' });
	}

	// Salida SEGURA: la sesion se persiste paso a paso, asi que salir no
	// la pierde; al reentrar, REANUDAR ofrece continuar.
	function volverAlInicio() {
		goto(resolve('/'));
	}

	// En CIERRE el store queda null a proposito: sin esta guarda se
	// generaria sesion nueva mientras se muestra el resumen.
	$effect(() => {
		if (subvista === 'CIERRE' || subvista === 'REANUDAR') return;
		if (respaldo === undefined) return;
		if (obtenerSesion() !== null) return;
		if (errorGeneracion !== null) return;
		if (!perfil || estados === undefined || historial === undefined || ultimaSesion === undefined) return;
		if (perfil === null) {
			errorGeneracion = 'No hay perfil. Completa el registro para empezar.';
			return;
		}

		const catalogo = [...obtenerCatalogo()];
		const { split } = elegirSplit(perfil.dias_semana, perfil.nivel_experiencia);
		const tipo = determinarTipoSesion(split, ultimaSesion ?? null);
		const generacion = generarSesion(tipo, perfil, catalogo, estados, historial);

		if (generacion.plan.length === 0) {
			errorGeneracion = M.sesion.errorPlanVacio;
			// Estado que bloquea la pantalla: el usuario debe conocerlo
			// de inmediato (convenciones-ui.md, anuncios por region viva).
			anunciarAssertive(M.sesion.errorPlanVacio);
			return;
		}

		comenzar(generacion.plan, tipo, Date.now());

		if (generacion.patrones_sin_pool.length > 0) {
			anunciarPolite('Hoy no hay ejercicios para algunos patrones');
		} else if (esSesionDeChequeo(historial, Date.now())) {
			anunciarPolite(M.sesion.avisoChequeo);
		}
	});

	// El bloque de error de generacion no es una fase de la maquina: sin
	// esto el foco queda huerfano en <body> cuando el plan sale vacio.
	$effect(() => {
		if (errorGeneracion !== null) enfocarPrincipal(refTitulo);
	});

	// Foco al h2 que nombra cada subvista. La lectura de slot?.ejercicio_id
	// y de completada fuerza la reejecucion al cambiar de ejercicio y al
	// llegar el resultado del cierre.
	$effect(() => {
		const slot = sesion?.plan[sesion.indice_ejercicio];
		void slot?.ejercicio_id;
		void completada;

		// Cada rama llama con la ref literal: la regla de invariantes exige
		// que el argumento de enfocarPrincipal sea un identificador ligado
		// por bind:this a un h1/h2, no una variable intermedia.
		if (subvista === 'REANUDAR') enfocarPrincipal(refReanudar);
		else if (subvista === 'EJERCICIO') enfocarPrincipal(refEjercicio);
		else if (subvista === 'POST_SERIE') enfocarPrincipal(refPostSerieTitulo);
		else if (subvista === 'DESCANSO') enfocarPrincipal(refDescanso);
		else if (subvista === 'DOLOR_ZONAS') enfocarPrincipal(refDolorZonas);
		else if (subvista === 'DOLOR_SUSTITUTO') enfocarPrincipal(refDolorSustituto);
		else if (subvista === 'DOLOR_POOL') enfocarPrincipal(refDolorPool);
		else if (subvista === 'CIERRE') enfocarPrincipal(refCierre);
	});

	// Al arrancar el sosten, la ref de arriba no se reejecuta (el nombre del
	// ejercicio no cambio). Al terminar, siguienteEjercicio() SI cambia el
	// slot y el efecto de arriba ya cubre el destino.
	$effect(() => {
		if (subvista === 'EJERCICIO' && sosteniendo) enfocarPrincipal(refSosten);
	});

	// El gesto atras del sistema debe retroceder dentro de la sesion en
	// las fases que tienen paso anterior; las demas fases lo dejan pasar
	// y el layout navega. Patron de Modal: listener en window dentro
	// de un $effect con cleanup.
	$effect(() => {
		const handler = (e: Event) => {
			const ev = e as CustomEvent & { defaultPrevented: boolean };
			if (subvista === 'DOLOR_ZONAS' && origenDolor !== null) {
				ev.preventDefault();
				transicionar({ tipo: 'cancelarDolorZonas' });
			} else if (subvista === 'DOLOR_SUSTITUTO' || subvista === 'DOLOR_POOL') {
				ev.preventDefault();
				transicionar({ tipo: 'revisarZonas' });
			} else if (subvista === 'POST_SERIE') {
				ev.preventDefault();
				transicionar({ tipo: 'cancelarPostSerie' });
			} else if (subvista === 'DESCANSO') {
				ev.preventDefault();
				if (modoAjusteDescanso) {
					modoAjusteDescanso = false;
				} else {
					manejarFinDescanso();
				}
			}
			// EJERCICIO, REANUDAR, CIERRE: no cancelan; el layout navega.
		};
		window.addEventListener('volveratras', handler);
		return () => window.removeEventListener('volveratras', handler);
	});

	let sesion = $derived(obtenerSesion());

	// La pregunta de esfuerzo sale solo en la sesion de chequeo y solo en
	// la ultima serie de cada ejercicio.
	let esChequeo = $derived(
		sesion !== null && historial !== undefined && esSesionDeChequeo(historial, sesion.fecha_inicio),
	);
	let mostrarPreguntaEsfuerzo = $derived.by(() => {
		const s = sesion;
		if (!s || !esChequeo) return false;
		const slot = s.plan[s.indice_ejercicio];
		return slot !== undefined && s.indice_serie + 1 >= slot.series;
	});

	function manejarSerieTerminada() {
		vibrar('fin');
		const s = sesion;
		const slot = s?.plan[s.indice_ejercicio];
		if (!s || !slot) return;
		if (mostrarPreguntaEsfuerzo) {
			transicionar(
				armarEventoCerrarSerie({
					indiceEjercicio: s.indice_ejercicio,
					totalEjercicios: s.plan.length,
					serieCompletada: s.indice_serie + 1,
					totalSeries: slot.series,
					esChequeo,
				}),
			);
		} else {
			manejarCierreDeSerieNormal(slot.reps_objetivo, null, slot);
		}
	}

	// Isometricos: parar el cronometro ES terminar la serie; los segundos
	// quedan registrados como la cantidad de la serie.
	function manejarCronometroParado(segundos: number) {
		repsReales = segundos;
		vibrar('fin');
		const s = sesion;
		const slot = s?.plan[s.indice_ejercicio];
		if (!s || !slot) return;
		if (mostrarPreguntaEsfuerzo) {
			transicionar(
				armarEventoCerrarSerie({
					indiceEjercicio: s.indice_ejercicio,
					totalEjercicios: s.plan.length,
					serieCompletada: s.indice_serie + 1,
					totalSeries: slot.series,
					esChequeo,
				}),
			);
		} else {
			manejarCierreDeSerieNormal(segundos, null, slot);
		}
	}

	// Cierra una serie sin pregunta de esfuerzo: registra (paridad con
	// manejarContinuarPostSerie), delega la fase a transicionar y aplica
	// los efectos por destino. El avance al siguiente ejercicio vive aca
	// (no en transicionar): la maquina solo decide la fase.
	function manejarCierreDeSerieNormal(
		reps: number,
		esfuerzo: number | null,
		slot: EjercicioPlanificado,
	): void {
		const previa = sesion;
		if (!previa) return;
		const serieCompletada = previa.indice_serie + 1;
		const totalSeries = slot.series;

		completarSerie(reps, esfuerzo, Date.now());
		sonar('serie-completada');
		const s = obtenerSesion();
		if (!s) return;

		const totalSesion = s.plan.reduce((acc, p) => acc + p.series, 0);
		const hechasSesion =
			s.plan.slice(0, s.indice_ejercicio).reduce((acc, p) => acc + p.series, 0) + s.indice_serie;

		transicionar(
			armarEventoCerrarSerie({
				indiceEjercicio: s.indice_ejercicio,
				totalEjercicios: s.plan.length,
				serieCompletada,
				totalSeries,
				esChequeo,
			}),
		);

		if (subvista === 'CIERRE') {
			// La ultima serie del ultimo ejercicio deja la sesion sin
			// ejercicio en curso, estado en el que cierra.
			siguienteEjercicio(Date.now());
			void manejarCerrar();
		} else if (subvista === 'EJERCICIO') {
			// Ultima serie del ejercicio con ejercicios restantes: el
			// anuncio nombra el ejercicio que sigue.
			siguienteEjercicio(Date.now());
			const despues = obtenerSesion();
			const nombre = obtenerEjercicio(slot.ejercicio_id)?.nombre ?? slot.ejercicio_id;
			const slotSiguiente = despues?.plan[despues.indice_ejercicio];
			const siguiente = slotSiguiente
				? (obtenerEjercicio(slotSiguiente.ejercicio_id)?.nombre ?? slotSiguiente.ejercicio_id)
				: '';
			anunciarPolite(M.sesion.anuncioEjercicioCompletado(nombre, hechasSesion, totalSesion, siguiente));
			vibrar('inicio');
			sonar('inicio-serie');
		} else if (subvista === 'DESCANSO') {
			anunciarPolite(
				M.sesion.anuncioSerieConDescanso(
					serieCompletada,
					totalSeries,
					hechasSesion,
					totalSesion,
					slot.descanso_segundos,
				),
			);
			sonar('inicio-descanso');
			// Precargar el Audio del fin-descanso apenas entramos: la WebView
			// pierde la primera reproduccion de un Audio "frio".
			precargar('fin-descanso');
		}
	}

	function manejarContinuarPostSerie() {
		const previa = sesion;
		if (!previa) return;
		const slot = previa.plan[previa.indice_ejercicio];
		if (!slot) return;
		if (mostrarPreguntaEsfuerzo && rirSeleccionado === null) {
			errorEsfuerzo = M.sesion.errorPostSerieSinEsfuerzo;
			anunciarAssertive(M.sesion.errorPostSerieSinEsfuerzo);
			(document.querySelector('#grupo-esfuerzo input') as HTMLElement | null)?.focus();
			return;
		}

		const serieCompletada = previa.indice_serie + 1;
		const totalSeries = slot.series;
		const esfuerzo = mostrarPreguntaEsfuerzo ? Number(rirSeleccionado) : null;
		completarSerie(repsReales, esfuerzo, Date.now());
		sonar('serie-completada');
		const s = obtenerSesion();
		if (!s) return;
		const totalSesion = s.plan.reduce((acc, p) => acc + p.series, 0);
		const hechasSesion =
			s.plan.slice(0, s.indice_ejercicio).reduce((acc, p) => acc + p.series, 0) + s.indice_serie;
		// POST_SERIE solo se alcanza con la pregunta de esfuerzo, que solo
		// sale en la ultima serie del ejercicio: la serie siempre lo cierra.
		const { esFinDeSesion } = armarEventoCerrarSerie({
			indiceEjercicio: s.indice_ejercicio,
			totalEjercicios: s.plan.length,
			serieCompletada,
			totalSeries,
			esChequeo,
		});
		transicionar({ tipo: 'continuarPostSerie', esFinDeSesion });
		siguienteEjercicio(Date.now());
		const despues = obtenerSesion();
		if (despues && despues.indice_ejercicio >= despues.plan.length) {
			void manejarCerrar();
		} else {
			const nombre = obtenerEjercicio(slot.ejercicio_id)?.nombre ?? slot.ejercicio_id;
			const slotSiguiente = despues?.plan[despues.indice_ejercicio];
			const siguiente = slotSiguiente
				? (obtenerEjercicio(slotSiguiente.ejercicio_id)?.nombre ?? slotSiguiente.ejercicio_id)
				: '';
			anunciarPolite(M.sesion.anuncioEjercicioCompletado(nombre, hechasSesion, totalSesion, siguiente));
			vibrar('inicio');
			sonar('inicio-serie');
		}
	}

	function manejarFinDescanso() {
		vibrar('descanso-fin');
		sonar('fin-descanso');
		const slot = sesion?.plan[sesion.indice_ejercicio];
		const nombre = slot ? (obtenerEjercicio(slot.ejercicio_id)?.nombre ?? slot.ejercicio_id) : '';
		// indice_serie ya fue incrementado por completarSerie; +1 es 1-based.
		const s = sesion ? sesion.indice_serie + 1 : 1;
		const total = slot?.series ?? 1;
		anunciarPolite(M.sesion.anuncioSiguienteSerie(s, total, nombre));
		transicionar({ tipo: 'finDescanso' });
	}

	function manejarAvisoDescanso() {
		vibrar('descanso-aviso');
	}

	function confirmarCorreccionDescanso() {
		const slot = sesion?.plan[sesion.indice_ejercicio];
		const unidad = obtenerEjercicio(slot?.ejercicio_id ?? '')?.medido_en ?? 'repeticiones';
		corregirUltimaSerie(repsReales, Date.now());
		anunciarPolite(M.sesion.confirmacionPostSerie(repsReales, unidad));
		modoAjusteDescanso = false;
	}

	function abrirReporteDolor() {
		zonasDolor = [];
		errorDolor = null;
		dolorYaBloqueado = false;
		transicionar({
			tipo: 'abrirDolor',
			desde: subvista === 'DESCANSO' ? 'DESCANSO' : 'EJERCICIO',
		});
	}

	// registrar -> bloquear -> buscar sustituto, en ese orden. El bloqueo
	// va antes para que una recarga en el peor momento no pierda el bloqueo.
	async function manejarConfirmarZonas(): Promise<void> {
		const s = sesion;
		if (!s || !perfil) return;
		// Validacion al pulsar, no al deshabilitar: el boton queda pulsable
		// aunque no haya zonas marcadas.
		if (zonasDolor.length === 0) {
			errorDolor = 'Marca al menos una zona donde sientes dolor para continuar.';
			anunciarAssertive(errorDolor);
			(document.querySelector('#grupo-zonas-dolor input') as HTMLElement | null)?.focus();
			return;
		}
		const slot = s.plan[s.indice_ejercicio];
		if (!slot) return;
		const ejercicioActual = obtenerEjercicio(slot.ejercicio_id);
		if (!ejercicioActual) return;

		reportandoDolor = true;
		errorDolor = null;
		try {
			if (!dolorYaBloqueado) {
				registrarDolor([...zonasDolor], Date.now());
				await bloquearEjercicio(slot.ejercicio_id, [...zonasDolor], Date.now());
				dolorYaBloqueado = true;
				anunciarAssertive('Ejercicio bloqueado por dolor');
				sonar('dolor-registrado');
			}
			estadosParaSustituir = await obtenerEstadosTodos();
			const sustituto = buscarSustituto(
				ejercicioActual,
				[...zonasDolor],
				[...obtenerCatalogo()],
				estadosParaSustituir,
				perfil.nivel_experiencia,
				s.plan,
			);
			if (sustituto !== null) {
				sustitutoPropuesto = sustituto;
			}
			transicionar({ tipo: 'confirmarZonas', haySustituto: sustituto !== null });
		} catch (e) {
			const code = (e as { code?: string }).code ?? 'ERR-DB-WRITE';
			errorDolor = mensajePara(code);
			anunciarError(code);
		} finally {
			reportandoDolor = false;
		}
	}

	function manejarContinuarSustituto() {
		if (!sustitutoPropuesto || !estadosParaSustituir) return;
		sustituir(sustitutoPropuesto, estadosParaSustituir, Date.now());
		anunciarPolite(`Continuamos con ${sustitutoPropuesto.nombre}`);
		sustitutoPropuesto = null;
		vibrar('inicio');
		sonar('inicio-serie');
		transicionar({ tipo: 'continuarSustituto' });
	}

	function manejarOmitirPatron() {
		siguienteEjercicio(Date.now());
		const despues = obtenerSesion();
		const esFinDeSesion = despues !== null && despues.indice_ejercicio >= despues.plan.length;
		transicionar({ tipo: 'omitirPatron', esFinDeSesion });
		if (esFinDeSesion) {
			void manejarCerrar();
		}
	}

	function manejarCancelarPorDolor() {
		sonar('navegacion-atras');
		cancelar(Date.now());
		transicionar({ tipo: 'interrumpirPorDolor' });
		void manejarCerrar();
	}

	async function manejarCerrar(): Promise<void> {
		cerrando = true;
		errorCerrar = null;
		try {
			vibrar('fin');
			const resultado = await cerrar(Date.now());
			// Datos frescos post-cierre: no depender del refresco del
			// liveQuery, que podria llegar tarde y dejar la racha desfasada.
			const [perfilFresco, estadosFrescos, historialFresco] = await Promise.all([
				obtenerPerfil(),
				obtenerEstadosTodos(),
				obtenerHistorial(),
			]);
			if (perfilFresco) {
				rachaCierre = calcularRacha(historialFresco, perfilFresco.dias_semana, Date.now());
				progresoCierre = contarProgresoSemana(historialFresco, perfilFresco.dias_semana, Date.now());
				vistaPreviaCierre = obtenerVistaPrevia(
					perfilFresco,
					estadosFrescos,
					historialFresco,
					resultado,
					[...obtenerCatalogo()],
					Date.now(),
				);
			}
			completada = resultado;
			if (!resultado.cancelada_por_dolor) {
				// Si esta sesion cerro la semana, festeja con 'racha'. Si la
				// semana ya estaba completa o todavia falta, suena
				// 'sesion-completada' (el logro es la sesion misma).
				const prog = progresoCierre;
				const cerroLaSemana = prog !== null && prog.meta > 0 && prog.hechas === prog.meta;
				sonar(cerroLaSemana ? 'racha' : 'sesion-completada');
			}
			anunciarPolite(
				resultado.cancelada_por_dolor
					? M.sesion.anuncioSesionCancelada
					: M.sesion.anuncioSesionCompletada,
			);
			// Solo sesiones de chequeo no canceladas sugieren progresion.
			if (!resultado.cancelada_por_dolor) {
				sugerenciasProgresion = evaluarProgresionesSugeridas(
					historialFresco,
					resultado,
					[...obtenerCatalogo()],
					rules.progresion['RULE-PROG-SESIONES-CONSEC'],
					estadosFrescos,
				);
				indiceSugerencia = 0;
			} else {
				sugerenciasProgresion = [];
			}
		} catch (e) {
			const code = (e as { code?: string }).code ?? 'ERR-DB-WRITE';
			errorCerrar = mensajePara(code);
			anunciarError(code);
		} finally {
			cerrando = false;
		}
	}

	async function aceptarSugerencia(): Promise<void> {
		const lista = sugerenciasProgresion;
		if (!lista || !perfil) return;
		const actual = lista[indiceSugerencia];
		if (!actual) return;
		aplicandoSugerencia = true;
		errorSugerencia = null;
		try {
			const resultado = progresar(actual.ejercicio, [...obtenerCatalogo()], perfil.objetivo);
			if (resultado.tipo !== 'cambio') {
				errorSugerencia = M.sesion.sugerenciaProgresionError;
				return;
			}
			await guardarEstado(resultado.estado_nuevo);
			anunciarPolite(M.sesion.anuncioProgresionAplicada(resultado.destino.nombre));
			sonar('sesion-completada');
			avanzarSugerencia();
		} catch (e) {
			const code = (e as { code?: string }).code ?? 'ERR-DB-WRITE';
			errorSugerencia = mensajePara(code);
			anunciarError(code);
		} finally {
			aplicandoSugerencia = false;
		}
	}

	function rechazarSugerencia(): void {
		avanzarSugerencia();
	}

	function avanzarSugerencia(): void {
		const lista = sugerenciasProgresion;
		if (!lista) return;
		const siguiente = indiceSugerencia + 1;
		if (siguiente >= lista.length) {
			sugerenciasProgresion = null;
			indiceSugerencia = 0;
		} else {
			indiceSugerencia = siguiente;
		}
	}

	$effect(() => {
		void sugerenciasProgresion;
		void indiceSugerencia;
		if (sugerenciasProgresion && sugerenciasProgresion.length > indiceSugerencia) {
			enfocarPrincipal(refTituloSugerencia);
			anunciarPolite(
				M.sesion.anuncioSugerencia(sugerenciasProgresion[indiceSugerencia].ejercicio.nombre),
			);
		}
	});

	// Reseteo a reps_objetivo solo en EJERCICIO. En POST_SERIE se consume el
	// valor actual, en DESCANSO se prellena con el ultimo ejecutado.
	$effect(() => {
		if (subvista !== 'EJERCICIO') return;
		const s = sesion;
		if (!s) return;
		const slot = s.plan[s.indice_ejercicio];
		if (slot) {
			repsReales = slot.reps_objetivo;
			sosteniendo = false;
		}
	});

	$effect(() => {
		if (subvista === 'POST_SERIE') {
			rirSeleccionado = null;
			ajustando = false;
			// con el atras nuevo (tarea 5) la fase se puede abandonar y
			// re-entrar; limpiamos para no arrastrar error stale.
			errorEsfuerzo = null;
		}
	});

	$effect(() => {
		if (rirSeleccionado !== null) errorEsfuerzo = null;
	});

	$effect(() => {
		if (errorDolor !== null && zonasDolor.length > 0) errorDolor = null;
	});

	$effect(() => {
		if (subvista === 'DESCANSO') {
			const s = sesion;
			if (s) {
				const slot = s.plan[s.indice_ejercicio];
				const id = slot?.ejercicio_id;
				const ejec = s.ejecutados.find((e) => e.ejercicio_id === id);
				const ultimo = ejec?.reps_reales[ejec.reps_reales.length - 1];
				if (ultimo !== undefined) repsReales = ultimo;
			}
		}
	});

	// Cero series completadas = no se entreno ese ejercicio (dolor antes de
	// la primera serie, dolor.ts registrarZonasDolor): no entra al resumen
	// de "hechos". El dato no se pierde, sigue en completada.ejercicios;
	// el reporte de dolor ya se ve en el bloqueo inmediato y en Progreso.
	let resumenEjercicios = $derived(
		completada
			? completada.ejercicios
					.filter((e) => e.series_completadas > 0)
					.map((e) => obtenerEjercicio(e.ejercicio_id)?.nombre ?? e.ejercicio_id)
			: [],
	);
</script>

<svelte:head>
	<title>{M.sesion.titulo}</title>
</svelte:head>

<!-- Cabecera durante toda la sesion activa menos en CIERRE. En CIERRE
     la accion inferior pasa a "Continuar": nunca dos controles al mismo
     destino, y el h1 queda fuera de la barra sin boton de salida. -->
{#if subvista !== 'CIERRE'}
	<Cabecera onclick={volverAlInicio} etiqueta={M.sesion.botonVolverInicio}>
		<h1 tabindex="-1" bind:this={refTitulo}>{M.sesion.titulo}</h1>
	</Cabecera>
{:else}
	<h1 tabindex="-1" bind:this={refTitulo}>{M.sesion.titulo}</h1>
{/if}

{#if errorGeneracion !== null}
	<p>{errorGeneracion}</p>
	{#if errorGeneracion === M.sesion.errorPlanVacio}
		<!-- La salida superior (BotonVolver) es la unica "Volver al
		     inicio"; la primaria atiende la causa del plan vacio. -->
		<Boton variante="primario" onclick={() => goto(resolve('/config/dolor'))}>{M.sesion.botonRevisarZonas}</Boton>
	{:else}
		<Boton variante="primario" onclick={() => goto(resolve('/'))}>{M.sesion.botonVolverInicio}</Boton>
	{/if}
{:else if subvista === 'CIERRE'}
	<!-- Va antes del chequeo de sesion: cerrar() deja el store en null
	     a proposito y aca se muestra la SesionCompletada local. -->
	{#if cerrando}
		<p>{M.sesion.cerrando}</p>
	{:else if errorCerrar !== null}
		<Card>
			<p class="text-error">{errorCerrar}</p>
			<div class="mt-6">
				<Boton variante="primario" onclick={manejarCerrar}>{M.sesion.botonVolverIntentar}</Boton>
			</div>
		</Card>
	{:else if completada !== null}
		{@const completadaLograda = !completada.cancelada_por_dolor}
		<Card>
			<div class="flex items-center gap-3">
				<h2 tabindex="-1" bind:this={refCierre} class="m-0 flex-1 min-w-0">
					{completadaLograda ? M.sesion.anuncioSesionCompletada : M.sesion.anuncioSesionCancelada}
				</h2>
				{#if completadaLograda}
					<!-- El color naranja es solo para logro; cancelada por dolor no aplica. -->
					<Medalla tamano={28} clase="text-naranja shrink-0" />
				{/if}
			</div>

			<p class="text-3xl font-bold font-mono tabular-nums text-text-primary mt-2">
				{formatearTiempo(completada.duracion_minutos * 60)}
			</p>

			<h3 class="font-semibold text-text-primary mt-4">{M.sesion.ejerciciosHechosTitulo}</h3>
			<ul class="m-0 p-0 list-none flex flex-col gap-1">
				{#each resumenEjercicios as nombre, i (i)}
					<li class="text-text-primary">{nombre}</li>
				{/each}
			</ul>

			{#if rachaCierre !== null && progresoCierre !== null}
				{@const cerroLaSemana = progresoCierre.meta > 0 && progresoCierre.hechas === progresoCierre.meta}
				{@const yaEstabaCompleta = progresoCierre.meta > 0 && progresoCierre.hechas > progresoCierre.meta}
				<div class="mt-4">
					{#if cerroLaSemana}
						<p class="tabular-nums text-naranja m-0">{M.sesion.rachaCierreSemanaCompleta(rachaCierre)}</p>
					{:else if yaEstabaCompleta}
						<p class="tabular-nums text-text-secondary m-0">{M.sesion.rachaCierre(rachaCierre)}</p>
					{:else}
						<p class="tabular-nums text-text-secondary m-0">{M.sesion.progresoCierre(progresoCierre.hechas, progresoCierre.meta)}</p>
					{/if}
				</div>
			{/if}

			{#if vistaPreviaCierre !== null}
				<div class="mt-4 pt-4 border-t border-border">
					<h3 class="font-semibold text-text-primary mt-0">{M.sesion.proximaSesionTitulo}</h3>
					<p class="text-text-primary m-0">
						{etiquetaTipoSesion(vistaPreviaCierre.tipo)}, {vistaPreviaCierre.plan.length} ejercicios
					</p>
				</div>
			{/if}
		</Card>

		{#if sugerenciasProgresion && sugerenciasProgresion.length > indiceSugerencia}
			<!-- Una sugerencia a la vez. Al agotarse la lista, este bloque
			     desaparece y queda el "Continuar" del cierre normal. -->
			{@const sug = sugerenciasProgresion[indiceSugerencia]}
			<Card>
				<h2 tabindex="-1" bind:this={refTituloSugerencia} class="m-0">
					{M.sesion.sugerenciaProgresionTitulo}
				</h2>
				<p class="text-text-primary mt-2">
					{M.sesion.sugerenciaProgresionPregunta(sug.ejercicio.nombre)}
				</p>
				{#if errorSugerencia !== null}
					<p class="text-error mt-2" role="alert">{errorSugerencia}</p>
				{/if}
			</Card>
			<BarraAccion>
				{#snippet primaria()}
					<Boton variante="primario" tamano="grande" onclick={aceptarSugerencia} deshabilitado={aplicandoSugerencia} silencioso>
						{M.sesion.sugerenciaProgresionBotonSi}
					</Boton>
				{/snippet}
				{#snippet secundaria()}
					<Boton variante="secundario" onclick={rechazarSugerencia} deshabilitado={aplicandoSugerencia}>
						{M.sesion.sugerenciaProgresionBotonNo}
					</Boton>
				{/snippet}
			</BarraAccion>
		{:else}
			<BarraAccion>
				{#snippet primaria()}
					<!-- En CIERRE la accion inferior es "Continuar". El BotonVolver
					     superior no se muestra: un segundo control al mismo destino
					     competiria con esta accion. -->
					<Boton variante="primario" tamano="grande" onclick={() => goto(resolve('/'))}>{M.sesion.botonContinuar}</Boton>
				{/snippet}
			</BarraAccion>
		{/if}
	{/if}
{:else if subvista === 'REANUDAR'}
	<Card>
		<h2 tabindex="-1" bind:this={refReanudar}>{M.sesion.tituloReanudar}</h2>
		<p class="text-text-secondary">{M.sesion.textoReanudar}</p>
	</Card>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={manejarReanudar} silencioso>{M.sesion.botonReanudar}</Boton>
		{/snippet}
		{#snippet secundaria()}
			<Boton variante="secundario" onclick={manejarEmpezarDeNuevo}>{M.sesion.botonEmpezarDeNuevo}</Boton>
		{/snippet}
	</BarraAccion>
{:else if sesion === null}
	<p>{M.sesion.cargando}</p>
{:else if subvista === 'EJERCICIO'}
	{@const slot = sesion.plan[sesion.indice_ejercicio]}
	{@const ejercicio = obtenerEjercicio(slot.ejercicio_id)}
	{@const unidad = ejercicio?.medido_en ?? 'repeticiones'}
	{#key `${sesion.indice_ejercicio}-${sesion.indice_serie}`}
		<h2 tabindex="-1" bind:this={refEjercicio}>{ejercicio?.nombre ?? slot.ejercicio_id}</h2>
		<Card>
			<p class="m-0">
				{M.sesion.progresoEjercicio(sesion.indice_ejercicio + 1, sesion.plan.length)},
				{M.sesion.progresoSerie(sesion.indice_serie + 1, slot.series)}.
			</p>
			<p class="m-0 mt-1">{M.sesion.objetivo(slot.reps_objetivo, unidad, slot.rir_objetivo)}</p>
		</Card>
		<!-- Herramientas (Como se hace, Reportar dolor) viven en el contenido,
		     no en la barra: la barra es solo para la accion primaria de avance. -->
		<div class="mt-6 flex flex-col gap-2">
			{#if ejercicio}
				<Boton variante="secundario" onclick={() => modalAbierto = true}>
					<span class="inline-flex items-center gap-2">
						<Informacion tamano={20} />
						{M.sesion.botonComoHacer}
					</span>
				</Boton>
			{/if}
			<Boton variante="secundario" onclick={abrirReporteDolor}>
				<span class="inline-flex items-center gap-2">
					<Alerta tamano={20} />
					{M.sesion.botonReportarDolor}
				</span>
			</Boton>
		</div>
		{#if ejercicio && modalAbierto}
			<Modal abierto={modalAbierto} titulo={M.sesion.tituloComoHacer(ejercicio.nombre)} alCerrar={() => modalAbierto = false}>
				<DescripcionEjercicio descripcion={ejercicio.descripcion} />
			</Modal>
		{/if}
	{/key}
		<BarraAccion>
			{#snippet primaria()}
				{#if unidad === 'segundos'}
					<!-- sostener = true -> Temporizador corriendo; false -> boton "Empezar". -->
					{#if sosteniendo}
					<div class="flex items-center justify-center gap-3">
						<!-- Solo-lector: nombra el arranque del sosten sin duplicar
						     el texto visible del Temporizador (que ya lo anuncia). -->
						<h2 tabindex="-1" bind:this={refSosten} class="sr-only">{M.sesion.sostenerEtiqueta}: {slot.reps_objetivo} segundos</h2>
						<Cronometro tamano={28} />
						{#key `${sesion.indice_ejercicio}-${sesion.indice_serie}`}
							<Temporizador
								segundos={slot.reps_objetivo}
								etiqueta={M.sesion.sostenerEtiqueta}
								alTerminar={() => manejarCronometroParado(slot.reps_objetivo)}
								cadenciaRelojMs={500}
							/>
						{/key}
					</div>
				{:else}
					<Boton variante="primario" tamano="grande" onclick={() => (sosteniendo = true)}>
						{M.sesion.sostenerEmpezar}
					</Boton>
				{/if}
			{:else}
				<Boton variante="primario" tamano="grande" onclick={manejarSerieTerminada} silencioso>
					<span class="inline-flex items-center gap-2">
						<CirculoCheque tamano={20} />
						{M.sesion.botonSerieTerminada}
					</span>
				</Boton>
			{/if}
		{/snippet}
	</BarraAccion>
{:else if subvista === 'POST_SERIE'}
	{@const slot = sesion.plan[sesion.indice_ejercicio]}
	{@const ejercicio = obtenerEjercicio(slot.ejercicio_id)}
	{@const unidad = ejercicio?.medido_en ?? 'repeticiones'}
	<!-- El h2 vive en la página (no en Card): la regla de invariantes exige
	     que el destino de foco esté ligado por bind:this en la ruta. -->
	<section class="bg-surface-alt border border-border rounded-lg p-4">
		<h2 tabindex="-1" bind:this={refPostSerieTitulo} class="text-lg font-semibold text-text-primary mb-2">
			{M.sesion.tituloPostSerie(sesion.indice_serie + 1, slot.series)}
		</h2>
		<p>{M.sesion.confirmacionPostSerie(repsReales, unidad)}</p>
		{#if ajustando}
			<ContadorReps bind:valor={repsReales} min={0} max={unidad === 'segundos' ? 600 : 99} {unidad} />
		{/if}
		{#if mostrarPreguntaEsfuerzo}
			<GrupoSeleccion
				leyenda={M.sesion.preguntaEsfuerzo(unidad)}
				nombre="esfuerzo"
				id="grupo-esfuerzo"
				opciones={[
					{ valor: '5', etiqueta: M.sesion.esfuerzoMuchas(unidad) },
					{ valor: '3', etiqueta: M.sesion.esfuerzoAlgunas(unidad) },
					{ valor: '1', etiqueta: M.sesion.esfuerzoPocas(unidad) },
					{ valor: '0', etiqueta: M.sesion.esfuerzoNinguna },
				]}
				bind:valor={rirSeleccionado}
				error={errorEsfuerzo}
			/>
		{/if}
		<!-- "Corregir cantidad" es herramienta: vive en el contenido, no en la barra. -->
		{#if !ajustando}
			<div class="mt-6">
				<Boton variante="secundario" onclick={() => ajustando = true}>{M.sesion.botonAjustarReps}</Boton>
			</div>
			<div class="mt-4">
				<Boton variante="secundario" onclick={() => transicionar({ tipo: 'cancelarPostSerie' })}>
					{M.sesion.botonVolverAlEjercicio}
				</Boton>
			</div>
		{/if}
	</section>
	<BarraAccion>
		{#snippet primaria()}
			<!-- Boton siempre pulsable: el error se muestra via GrupoSeleccion. -->
			<Boton
				variante="primario"
				tamano="grande"
				onclick={manejarContinuarPostSerie}
				silencioso
			>
				{M.sesion.botonContinuar}
			</Boton>
		{/snippet}
	</BarraAccion>
{:else if subvista === 'DESCANSO'}
	{@const slot = sesion.plan[sesion.indice_ejercicio]}
	{@const ejercicio = obtenerEjercicio(slot.ejercicio_id)}
	{@const unidad = ejercicio?.medido_en ?? 'repeticiones'}
	<h2 tabindex="-1" bind:this={refDescanso} class="flex items-center gap-2"><Reloj /><span>{M.sesion.descansoTitulo}</span></h2>
	{#if modoAjusteDescanso}
		<p>{M.sesion.confirmacionPostSerie(repsReales, unidad)}</p>
		<ContadorReps bind:valor={repsReales} min={0} max={unidad === 'segundos' ? 600 : 99} {unidad} />
		<BarraAccion>
			{#snippet primaria()}
				<Boton variante="primario" tamano="grande" onclick={confirmarCorreccionDescanso}>{M.sesion.botonConfirmar}</Boton>
			{/snippet}
			{#snippet secundaria()}
				<Boton variante="secundario" onclick={() => modoAjusteDescanso = false}>{M.sesion.botonVolverDescanso}</Boton>
			{/snippet}
		</BarraAccion>
	{:else}
		<!-- {#key} remonta el Temporizador al volver del modo ajuste.
		     Decidido asi para evitar condicion de carrera con el setInterval. -->
		<Card>
			<div class="text-center my-4">
				{#key sesion.indice_ejercicio + '-' + sesion.indice_serie + '-' + (modoAjusteDescanso ? 'a' : 'b')}
					<Temporizador
						segundos={slot.descanso_segundos}
						alTerminar={manejarFinDescanso}
						alAviso={manejarAvisoDescanso}
						aviso_segundos={3}
					/>
				{/key}
			</div>
		</Card>
		<!-- Herramientas: corregir cantidad, reportar dolor. Viven en el contenido. -->
		<div class="mt-4 flex flex-col gap-2">
			<Boton variante="secundario" onclick={() => modoAjusteDescanso = true}>{M.sesion.botonAjustarReps}</Boton>
			<Boton variante="secundario" onclick={abrirReporteDolor}>
				<span class="inline-flex items-center gap-2">
					<Alerta tamano={20} />
					{M.sesion.botonReportarDolor}
				</span>
			</Boton>
		</div>
		<BarraAccion>
			{#snippet primaria()}
				<!-- Siempre "Saltar descanso"; al llegar a 0 la sesion
			     avanza sola, no se convierte en "Continuar": ese cambio
			     de copia no se alcanzaba a ver y confundia. -->
				<Boton variante="primario" tamano="grande" onclick={manejarFinDescanso} silencioso>
					<span class="inline-flex items-center gap-2">
						<Saltar tamano={20} />
						{M.sesion.botonSaltarDescanso}
					</span>
				</Boton>
			{/snippet}
		</BarraAccion>
	{/if}
{:else if subvista === 'DOLOR_ZONAS'}
	<Card>
		<h2 tabindex="-1" bind:this={refDolorZonas}>{M.sesion.dolorZonasTitulo}</h2>
		<GrupoSeleccionMultiple
			id="grupo-zonas-dolor"
			leyenda={M.sesion.dolorZonasLeyenda}
			nombre="zonas-dolor"
			opciones={ZONAS.map((zona) => ({ valor: zona, etiqueta: etiquetaZona(zona) }))}
			bind:valores={zonasDolor}
			error={errorDolor}
		/>
	</Card>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={manejarConfirmarZonas} deshabilitado={reportandoDolor} silencioso>{M.sesion.botonConfirmar}</Boton>
		{/snippet}
		{#snippet secundaria()}
			<Boton variante="secundario" onclick={() => transicionar({ tipo: 'cancelarDolorZonas' })} deshabilitado={reportandoDolor}>{M.sesion.botonCancelar}</Boton>
		{/snippet}
	</BarraAccion>
{:else if subvista === 'DOLOR_SUSTITUTO' && sustitutoPropuesto !== null}
	{@const slot = sesion.plan[sesion.indice_ejercicio]}
	{@const actual = obtenerEjercicio(slot.ejercicio_id)}
	<Card>
		<h2 tabindex="-1" bind:this={refDolorSustituto}>{M.sesion.dolorSustitutoTitulo(actual?.nombre ?? slot.ejercicio_id, sustitutoPropuesto.nombre)}</h2>
		<p class="text-text-secondary">
			{M.sesion.dolorSustitutoCuerpo(zonasDolor.map((z) => etiquetaZona(z).toLowerCase()).join(', '))}
		</p>
	</Card>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={manejarContinuarSustituto} silencioso>
				<span class="inline-flex items-center gap-2">
					<CirculoCheque tamano={20} />
					{M.sesion.botonContinuarCambio}
				</span>
			</Boton>
		{/snippet}
		{#snippet secundaria()}
			<div class="flex flex-col gap-2">
				<Boton variante="secundario" onclick={() => transicionar({ tipo: 'revisarZonas' })}>{M.sesion.botonRevisarZonas}</Boton>
				<Boton variante="secundario" onclick={manejarCancelarPorDolor} silencioso>{M.sesion.botonInterrumpirSesion}</Boton>
			</div>
		{/snippet}
	</BarraAccion>
{:else if subvista === 'DOLOR_POOL'}
	<Card>
		<h2 tabindex="-1" bind:this={refDolorPool}>{M.sesion.dolorSinReemplazoTitulo}</h2>
	</Card>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={manejarOmitirPatron}>{M.sesion.botonOmitirPatron}</Boton>
		{/snippet}
		{#snippet secundaria()}
			<div class="flex flex-col gap-2">
				<Boton variante="secundario" onclick={() => transicionar({ tipo: 'revisarZonas' })}>{M.sesion.botonRevisarZonas}</Boton>
				<Boton variante="secundario" onclick={manejarCancelarPorDolor} silencioso>{M.sesion.botonInterrumpirSesion}</Boton>
			</div>
		{/snippet}
	</BarraAccion>
{/if}