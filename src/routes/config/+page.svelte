<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { obtenerPerfil, actualizarPerfil, borrarPerfil, restablecerBase } from '$lib/db/perfil';
	import { obtenerEstadosBloqueados } from '$lib/db/estado';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara } from '$lib/errores/mensajes';
	import { OBJETIVOS, ZONAS, type Objetivo, type Zona, type EstadoEjercicio } from '$lib/motor/schema';
	import { etiquetaObjetivo, descripcionObjetivo, etiquetaZona } from '$lib/catalogo/etiquetas';
	import GrupoSeleccionMultiple from '$lib/components/GrupoSeleccionMultiple.svelte';
	import {
		armarParcheDatos,
		inputsDesdePerfil,
		validarDatosEditados
	} from '$lib/onboarding/validacion-datos';
	import { manejarExportar as manejarExportarArchivo } from '$lib/importar/compartir';
	import { exportarDatos } from '$lib/importar/importar';
	import {
		sonidosActivados,
		establecerSonidos,
		establecerVolumenEfectos,
		volumenEfectos,
		sonar,
		precargar
	} from '$lib/sonido/reproducir';
	import {
		musicaActivada,
		establecerMusicaActivada,
		establecerVolumenMusica,
		volumenMusica
	} from '$lib/sonido/musica';
	import {
		volumenAPorcentaje,
		porcentajeAVolumen
	} from '$lib/a11y/volumen';
	import { calcularImc, type CategoriaImc } from '$lib/salud/imc';
	import { pantallaEncendidaActivada, establecerPantallaEncendida } from '$lib/pantalla/despierta';
	import { capitalizar } from '$lib/ui/texto';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import ContadorReps from '$lib/components/ContadorReps.svelte';
	import Card from '$lib/components/Card.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';
	import Engranaje from '$lib/components/iconos/Engranaje.svelte';
	import ImportarRespaldo from '$lib/components/ImportarRespaldo.svelte';

	type Subvista =
		| 'PERFIL'
		| 'CONFIGURACION'
		| 'AUDIO'
		| 'OBJETIVO'
		| 'DISPONIBILIDAD'
		| 'DATOS'
		| 'DOLOR'
		| 'REHACER_1'
		| 'REHACER_2'
		| 'IMPORTAR'
		| 'RESTABLECER_1'
		| 'RESTABLECER_2';

	const DIAS = [2, 3, 4, 5];

	const LABELS_CATEGORIA_IMC: Record<CategoriaImc, string> = {
		bajo_peso: 'bajo peso',
		normal: 'normal',
		sobrepeso: 'sobrepeso',
		obesidad: 'obesidad'
	};

	const SALVEDAD_IMC =
		'El IMC es una razón entre tu peso y tu altura, un indicador general. No mide grasa corporal: su relación con la composición real cambia con la edad, la contextura y el origen.';

	let heading = $state<HTMLElement>();
	// ?vista=configuracion abre directo en la lista: lo usa la ayuda
	// para volver aca (la subvista no sobrevive a la navegacion).
	let subvista = $state<Subvista>(
		page.url.searchParams.get('vista') === 'configuracion' ? 'CONFIGURACION' : 'PERFIL'
	);
	let objetivoSeleccionado = $state<Objetivo | null>(null);
	let diasSeleccionados = $state<number | null>(null);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	let perfil = $state<Awaited<ReturnType<typeof obtenerPerfil>> | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);

	$effect(() => {
		const sub = liveQuery(() => obtenerPerfil()).subscribe({
			next: (v) => { perfil = v ?? null; },
			error: (e) => { errorLectura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		void subvista;
		enfocarPrincipal(heading);
	});

	function abrirObjetivo() {
		objetivoSeleccionado = perfil?.objetivo ?? null;
		errorEscritura = null;
		subvista = 'OBJETIVO';
	}

	function abrirDisponibilidad() {
		diasSeleccionados = perfil?.dias_semana ?? null;
		errorEscritura = null;
		subvista = 'DISPONIBILIDAD';
	}

	// Las sub-pantallas se abren desde CONFIGURACION: atras, cancelar y
	// guardar vuelven ahi, no al perfil.
	function volverAConfiguracion() {
		errorEscritura = null;
		subvista = 'CONFIGURACION';
	}

	async function guardarObjetivo() {
		if (objetivoSeleccionado === null) return;
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ objetivo: objetivoSeleccionado });
			avisar('Objetivo guardado', 'exito');
			subvista = 'CONFIGURACION';
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	async function guardarDisponibilidad() {
		if (diasSeleccionados === null) return;
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ dias_semana: diasSeleccionados });
			avisar('Disponibilidad guardada', 'exito');
			subvista = 'CONFIGURACION';
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	// Sub-pantalla DATOS. Misma validacion que el onboarding. La edad
	// se guarda como anio_nacimiento. No recalcula plan ni evaluacion.
	const anioActual = new Date().getFullYear();
	let nombreEdit = $state('');
	let edadEdit = $state('');
	let pesoEdit = $state('');
	let alturaEdit = $state('');
	let errorNombreEdit = $state<string | null>(null);
	let errorEdadEdit = $state<string | null>(null);
	let errorPesoEdit = $state<string | null>(null);
	let errorAlturaEdit = $state<string | null>(null);

	function abrirDatos() {
		if (perfil) {
			const inputs = inputsDesdePerfil(perfil, anioActual);
			nombreEdit = inputs.nombre;
			edadEdit = inputs.edad;
			pesoEdit = inputs.peso;
			alturaEdit = inputs.altura;
		}
		errorNombreEdit = null;
		errorEdadEdit = null;
		errorPesoEdit = null;
		errorAlturaEdit = null;
		errorEscritura = null;
		subvista = 'DATOS';
	}

	async function guardarDatos() {
		const resultado = validarDatosEditados(nombreEdit, edadEdit, pesoEdit, alturaEdit);
		errorNombreEdit = resultado.errores.nombre;
		errorEdadEdit = resultado.errores.edad;
		errorPesoEdit = resultado.errores.peso;
		errorAlturaEdit = resultado.errores.altura;

		if (!resultado.valido) {
			// Foco al primer campo con error; el boton siempre es pulsable
			// (un disabled no recibe foco y TalkBack lo salta).
			anunciarAssertive('Revisa los datos: hay campos por completar.');
			if (resultado.primerError !== null) {
				const id = {
					nombre: 'datos-nombre',
					edad: 'datos-edad',
					peso: 'datos-peso',
					altura: 'datos-altura'
				}[resultado.primerError];
				document.getElementById(id)?.focus();
			}
			return;
		}

		guardando = true;
		errorEscritura = null;
		try {
			const parche = armarParcheDatos(nombreEdit, edadEdit, pesoEdit, alturaEdit, anioActual);
			await actualizarPerfil(parche);
			avisar('Datos guardados', 'exito');
			subvista = 'CONFIGURACION';
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	// Sub-pantalla DOLOR: zonas permanentes editables + bloqueados.
	// Las zonas filtran ejercicios en CADA generacion de sesion; hasta
	// ahora solo se podian fijar en el onboarding.
	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });
	let zonasEdit = $state<Zona[]>([]);
	let bloqueados = $state<EstadoEjercicio[] | undefined>(undefined);

	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosBloqueados()).subscribe({
			next: (v) => { bloqueados = v; },
			error: (e) => { errorLectura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	function abrirDolor() {
		zonasEdit = [...(perfil?.zonas_dolor_preexistente ?? [])];
		errorEscritura = null;
		subvista = 'DOLOR';
	}

	async function guardarZonasDolor() {
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ zonas_dolor_preexistente: [...zonasEdit] });
			avisar('Zonas guardadas', 'exito');
			subvista = 'CONFIGURACION';
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	// Pantalla encendida (preferencia de dispositivo, localStorage).
	let pantallaEncendida = $state(pantallaEncendidaActivada());

	async function alternarPantalla() {
		pantallaEncendida = !pantallaEncendida;
		await establecerPantallaEncendida(pantallaEncendida);
		avisar(pantallaEncendida ? 'La pantalla queda encendida' : 'La pantalla puede apagarse', 'exito');
	}

	// Sonidos de la interfaz (preferencia de dispositivo, localStorage).
	let sonidos = $state(sonidosActivados());

	function alternarSonidos() {
		sonidos = !sonidos;
		establecerSonidos(sonidos);
		avisar(sonidos ? 'Efectos activados' : 'Efectos desactivados', 'exito');
	}

	// Sub-pantalla AUDIO: efectos + musica, cada uno con on/off y
	// deslizador. El estado se relee al entrar a la subvista, asi si
	// otra parte del sistema lo cambio, la UI no se desincroniza.
	let musica = $state(musicaActivada());
	let volumenEfectosPct = $state(volumenAPorcentaje(volumenEfectos()));
	let volumenMusicaPct = $state(volumenAPorcentaje(volumenMusica()));

	function abrirAudio() {
		errorEscritura = null;
		sonidos = sonidosActivados();
		musica = musicaActivada();
		volumenEfectosPct = volumenAPorcentaje(volumenEfectos());
		volumenMusicaPct = volumenAPorcentaje(volumenMusica());
		subvista = 'AUDIO';
	}

	function alternarMusica() {
		musica = !musica;
		establecerMusicaActivada(musica);
		avisar(musica ? 'Música activada' : 'Música desactivada', 'exito');
	}

	// Cada toque es la decision final: persiste y emite la muestra en
	// el mismo handler. Para efectos, suena un `tic` corto como muestra
	// audible del nivel (el modulo no lanza si el .mp3 no esta).
	function onCambiarVolumenEfectos() {
		establecerVolumenEfectos(porcentajeAVolumen(volumenEfectosPct));
		sonar('tic');
	}

	function onCambiarVolumenMusica() {
		establecerVolumenMusica(porcentajeAVolumen(volumenMusicaPct));
	}

	// La logica de exportacion vive en $lib/importar/compartir (rama
	// APK vs navegador). Este handler solo orquesta y traduce errores.
	async function manejarExportar() {
		guardando = true;
		errorEscritura = null;
		try {
			const datos = await exportarDatos();
			const json = JSON.stringify(datos, null, 2);
			await manejarExportarArchivo(json, datos.perfil?.nombre ?? 'usuario', Date.now());
			avisar('Copia guardada', 'exito');
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	async function confirmarRehacer() {
		guardando = true;
		errorEscritura = null;
		try {
			await borrarPerfil();
			sonar('re-evaluar');
			avisar('Perfil eliminado', 'exito');
			goto(resolve('/onboarding'));
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	async function confirmarRestablecer() {
		guardando = true;
		errorEscritura = null;
		try {
			// Borra las cinco tablas en una sola transaccion. La
			// preferencia de sonido (localStorage) no es dato del usuario
			// y queda fuera.
			await restablecerBase();
			sonar('papelera');
			avisar('Borramos todos tus datos', 'exito');
			goto(resolve('/onboarding'));
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-WRITE');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}
</script>

<svelte:head><title>Perfil</title></svelte:head>

{#if errorLectura !== null}
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<p>Cargando...</p>
{:else if perfil === null}
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>Completar el registro</Boton>
{:else if subvista === 'PERFIL'}
	<div class="flex items-center justify-between gap-3">
		<h1 tabindex="-1" bind:this={heading} class="mb-0">Perfil</h1>
		<button
			type="button"
			aria-label="Configuración"
			class="min-h-12 min-w-12 flex items-center justify-center rounded-full bg-surface-alt border border-border-strong text-text-primary transition-colors active:brightness-90 hover:border-acento focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface touch-manipulation"
			onclick={() => { errorEscritura = null; subvista = 'CONFIGURACION'; }}
		>
			<Engranaje tamano={22} />
		</button>
	</div>
	<div class="flex flex-col gap-4 mt-4">
		<Card titulo="Tu plan">
			<p class="m-0">Nombre: {perfil.nombre || '—'}</p>
			<p class="m-0">Objetivo: {etiquetaObjetivo(perfil.objetivo)}</p>
			<p class="m-0 tabular-nums">Entrenas {perfil.dias_semana} días por semana.</p>
			<p class="m-0 tabular-nums">{perfil.duracion_sesion_min === 1 ? 'Sesión de 1 minuto' : `Sesiones de ${perfil.duracion_sesion_min} minutos`}.</p>
			<p class="m-0">Nivel: {capitalizar(perfil.nivel_experiencia)}.</p>
		</Card>
		{#if perfil.altura_cm != null}
			{@const imc = calcularImc(perfil.peso_kg, perfil.altura_cm)}
			{#if imc !== null}
				<Card titulo="Índice de masa corporal">
					<p class="m-0 text-4xl font-bold font-mono tabular-nums">{imc.valor.toFixed(1)}</p>
					<p class="m-0 text-text-secondary">Categoría: {LABELS_CATEGORIA_IMC[imc.categoria]}.</p>
					<p class="m-0 text-sm text-text-secondary">{SALVEDAD_IMC}</p>
				</Card>
			{:else}
				<Card titulo="Índice de masa corporal">
					<p class="m-0">No disponible (falta tu altura).</p>
				</Card>
			{/if}
		{:else}
			<Card titulo="Índice de masa corporal">
				<p class="m-0">No disponible. Carga tu altura en el registro para ver el IMC.</p>
			</Card>
		{/if}
	</div>
{:else if subvista === 'CONFIGURACION'}
	<BotonVolver onclick={() => { errorEscritura = null; subvista = 'PERFIL'; }} />
	<h1 tabindex="-1" bind:this={heading}>Configuración</h1>

	<section aria-labelledby="sec-plan" class="mt-4">
		<h2 id="sec-plan">Tu plan</h2>
		<div class="flex flex-col gap-2">
			<!-- Como los ajustes de Android: la fila nombra el dato y muestra
			     el valor actual; el verbo sobra. -->
			<button
				type="button"
				onclick={abrirObjetivo}
				class="clase-fila-configuracion"
			>
				<span>Objetivo</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate">{etiquetaObjetivo(perfil.objetivo)}</span>
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={abrirDisponibilidad}
				class="clase-fila-configuracion"
			>
				<span>Días y duración</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate tabular-nums">{perfil.dias_semana} {perfil.dias_semana === 1 ? 'día' : 'días'}, {perfil.duracion_sesion_min} min</span>
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={abrirDatos}
				class="clase-fila-configuracion"
			>
				<span>Mis datos</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-audio" class="mt-6">
		<h2 id="sec-audio">Sonido y música</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={abrirAudio}
				class="clase-fila-configuracion"
			>
				<span>Efectos y música</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-evaluacion" class="mt-6">
		<h2 id="sec-evaluacion">Tu evaluación</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => { errorEscritura = null; subvista = 'REHACER_1'; }}
				class="clase-fila-configuracion"
			>
				<span>Volver a hacer la evaluación</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-dolor" class="mt-6">
		<h2 id="sec-dolor">Dolor</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={abrirDolor}
				class="clase-fila-configuracion"
			>
				<span>Zonas con dolor y ejercicios bloqueados</span>
				<span class="flex items-center gap-2 min-w-0">
					{#if bloqueados !== undefined && bloqueados.length > 0}
						<span class="text-text-secondary truncate tabular-nums">{bloqueados.length} {bloqueados.length === 1 ? 'bloqueado' : 'bloqueados'}</span>
					{/if}
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
				</span>
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-datos" class="mt-6">
		<h2 id="sec-datos">Tus datos</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={manejarExportar}
				disabled={guardando}
				class="clase-fila-configuracion"
			>
				<span>Exportar mis datos</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
			<button
				type="button"
				onclick={() => { errorEscritura = null; subvista = 'IMPORTAR'; }}
				class="clase-fila-configuracion"
			>
				<span>Importar datos desde archivo</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
			<!-- Doble confirmacion. Distinta de "Rehacer evaluacion" (que
			     borra solo el perfil y conserva historial/estados/dolor). -->
			<button
				type="button"
				onclick={() => { errorEscritura = null; subvista = 'RESTABLECER_1'; }}
				class="clase-fila-configuracion"
			>
				<span>Borrar todo y empezar de cero</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-general" class="mt-6">
		<h2 id="sec-general">General</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={alternarPantalla}
				aria-label={pantallaEncendida ? 'Mantener la pantalla encendida: activado' : 'Mantener la pantalla encendida: desactivado'}
				class="clase-fila-configuracion"
			>
				<span>Mantener la pantalla encendida</span>
				<span class="text-text-secondary">{pantallaEncendida ? 'Activado' : 'Desactivado'}</span>
			</button>
		</div>
	</section>

	<!-- La ayuda cierra la lista, como en los ajustes de Android. -->
	<section aria-labelledby="sec-informacion" class="mt-6">
		<h2 id="sec-informacion">Información</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta interna resuelta, solo se agrega el query
					goto(`${resolve('/ayuda')}?de=config`);
				}}
				class="clase-fila-configuracion"
			>
				<span>Ayuda</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
{:else if subvista === 'OBJETIVO'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<h2>¿Cuál es tu objetivo?</h2>
	<fieldset>
		<legend>Selecciona tu objetivo</legend>
		{#each OBJETIVOS as obj (obj)}
			<div>
				<input type="radio" id="obj-{obj}" name="objetivo" value={obj} bind:group={objetivoSeleccionado} />
				<label for="obj-{obj}">
					<strong>{etiquetaObjetivo(obj)}</strong>
					<span>: {descripcionObjetivo(obj)}</span>
				</label>
			</div>
		{/each}
	</fieldset>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex gap-4">
		<Boton variante="primario" onclick={guardarObjetivo} deshabilitado={guardando || objetivoSeleccionado === null}>Guardar</Boton>
		<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>Cancelar</Boton>
	</div>
{:else if subvista === 'DISPONIBILIDAD'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<h2>¿Cuántos días por semana puedes entrenar?</h2>
	<fieldset>
		<legend>Selecciona los días</legend>
		{#each DIAS as dia (dia)}
			<div>
				<input type="radio" id="dias-{dia}" name="dias" value={dia} bind:group={diasSeleccionados} />
				<label for="dias-{dia}">{dia} {dia === 1 ? 'día' : 'días'} por semana</label>
			</div>
		{/each}
	</fieldset>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex gap-4">
		<Boton variante="primario" onclick={guardarDisponibilidad} deshabilitado={guardando || diasSeleccionados === null}>Guardar</Boton>
		<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>Cancelar</Boton>
	</div>
{:else if subvista === 'DATOS'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Cambiar mis datos</h1>
	<p>Edita tu nombre, edad, peso y altura. Esos datos se usan para mostrarte el índice de masa corporal; el plan de entrenamiento no cambia.</p>
	<form onsubmit={(e) => { e.preventDefault(); void guardarDatos(); }} novalidate>
		<div class="space-y-6">
			<Card titulo="Sobre ti">
				<div class="space-y-4">
					<div>
						<label for="datos-nombre">Nombre</label>
						<input
							type="text"
							id="datos-nombre"
							bind:value={nombreEdit}
							autocomplete="name"
							autocapitalize="words"
							aria-invalid={errorNombreEdit !== null ? 'true' : undefined}
							aria-describedby={errorNombreEdit !== null ? 'error-datos-nombre' : undefined}
							required
						/>
						{#if errorNombreEdit}
							<p id="error-datos-nombre" class="mt-1 text-sm text-error">{errorNombreEdit}</p>
						{/if}
					</div>
				</div>
			</Card>
			<Card titulo="Medidas">
				<div class="space-y-4">
					<div>
						<label for="datos-edad">Edad</label>
						<input
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="off"
							id="datos-edad"
							bind:value={edadEdit}
							aria-invalid={errorEdadEdit !== null ? 'true' : undefined}
							aria-describedby={errorEdadEdit !== null ? 'error-datos-edad' : undefined}
							required
						/>
						{#if errorEdadEdit}
							<p id="error-datos-edad" class="mt-1 text-sm text-error">{errorEdadEdit}</p>
						{/if}
					</div>
					<div>
						<label for="datos-peso">Peso</label>
						<div class="flex items-center gap-2">
							<input
								type="text"
								inputmode="decimal"
								pattern="[0-9]+([.,][0-9])?"
								autocomplete="off"
								id="datos-peso"
								bind:value={pesoEdit}
								aria-invalid={errorPesoEdit !== null ? 'true' : undefined}
								aria-describedby={'unidad-datos-peso' + (errorPesoEdit !== null ? ' error-datos-peso' : '')}
								required
							/>
							<span id="unidad-datos-peso" class="text-text-secondary shrink-0">kg</span>
						</div>
						{#if errorPesoEdit}
							<p id="error-datos-peso" class="mt-1 text-sm text-error">{errorPesoEdit}</p>
						{/if}
					</div>
					<div>
						<label for="datos-altura">Altura</label>
						<div class="flex items-center gap-2">
							<input
								type="text"
								inputmode="decimal"
								pattern={'[0-9]+([.,][0-9]{1,2})?'}
								autocomplete="off"
								id="datos-altura"
								bind:value={alturaEdit}
								aria-invalid={errorAlturaEdit !== null ? 'true' : undefined}
								aria-describedby={'unidad-datos-altura' + (errorAlturaEdit !== null ? ' error-datos-altura' : '')}
							/>
							<span id="unidad-datos-altura" class="text-text-secondary shrink-0">m</span>
						</div>
						{#if errorAlturaEdit}
							<p id="error-datos-altura" class="mt-1 text-sm text-error">{errorAlturaEdit}</p>
						{/if}
					</div>
				</div>
			</Card>
		</div>
		{#if errorEscritura !== null}
			<p class="mt-4">{errorEscritura}</p>
		{/if}
		<div class="mt-6 flex flex-col gap-2">
			<Boton variante="primario" type="submit" deshabilitado={guardando}>Guardar</Boton>
			<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>Cancelar</Boton>
		</div>
	</form>
{:else if subvista === 'DOLOR'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Dolor</h1>

	<section aria-labelledby="sec-dolor-zonas" class="mt-4">
		<h2 id="sec-dolor-zonas">Zonas con dolor permanente</h2>
		<p>Los ejercicios que exigen estas zonas no entran en tus sesiones. Si una zona mejoró, desmárcala.</p>
		<GrupoSeleccionMultiple
			id="grupo-zonas-config"
			leyenda="Marca las zonas con dolor permanente"
			nombre="zonas-config"
			opciones={ZONAS.map((zona) => ({ valor: zona, etiqueta: etiquetaZona(zona) }))}
			bind:valores={zonasEdit}
		/>
		{#if errorEscritura !== null}
			<p>{errorEscritura}</p>
		{/if}
		<div class="mt-4 flex gap-4">
			<Boton variante="primario" onclick={guardarZonasDolor} deshabilitado={guardando}>Guardar</Boton>
			<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>Cancelar</Boton>
		</div>
	</section>

	<section aria-labelledby="sec-dolor-bloqueados" class="mt-8">
		<h2 id="sec-dolor-bloqueados">Ejercicios bloqueados por dolor</h2>
		{#if bloqueados === undefined}
			<p>Cargando...</p>
		{:else if bloqueados.length === 0}
			<p>No tienes ejercicios bloqueados.</p>
		{:else}
			<p>Toca un ejercicio para ver el detalle o reactivarlo antes de tiempo.</p>
			<div class="flex flex-col gap-2">
				{#each bloqueados as b (b.ejercicio_id)}
					<button
						type="button"
						onclick={() => goto(resolve('/biblioteca/[id]', { id: b.ejercicio_id }))}
						class="clase-fila-configuracion"
					>
						<span class="min-w-0">
							<span class="block truncate">{obtenerEjercicio(b.ejercicio_id)?.nombre ?? b.ejercicio_id}</span>
							{#if b.fecha_revision !== null}
								<span class="block text-sm text-text-secondary">Se te pregunta el {FORMATO_FECHA.format(b.fecha_revision)}</span>
							{/if}
						</span>
						<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
					</button>
				{/each}
			</div>
		{/if}
	</section>
{:else if subvista === 'IMPORTAR'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<h2>Importar datos desde archivo</h2>
	<p>Esto reemplaza TODOS tus datos (perfil, historial, estado de ejercicios y eventos de dolor) por los del archivo. El archivo se valida antes: si no es una exportación válida, no se modifica nada.</p>
	<ImportarRespaldo etiquetaBoton="Importar y reemplazar mis datos" onImportado={() => { subvista = 'PERFIL'; }} />
{:else if subvista === 'REHACER_1'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<h2>Volver a hacer la evaluación</h2>
	<p>Borra tu perfil y tu evaluación y te lleva de nuevo al registro. Tu historial de sesiones queda como está.</p>
	<div class="mt-6 flex flex-col gap-2">
		<Boton variante="primario" onclick={() => { precargar('re-evaluar'); subvista = 'REHACER_2'; }}>Continuar</Boton>
	</div>
{:else if subvista === 'REHACER_2'}
	<BotonVolver onclick={() => { errorEscritura = null; subvista = 'REHACER_1'; }} />
	<h1 tabindex="-1" bind:this={heading}>Perfil</h1>
	<h2>¿Estás seguro?</h2>
	<p>Esto no se puede deshacer.</p>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex flex-col gap-2">
		<Boton variante="primario" onclick={confirmarRehacer} deshabilitado={guardando} silencioso>Sí, borrar mi perfil y rehacer la evaluación</Boton>
		<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>No, conservar mi perfil</Boton>
	</div>
{:else if subvista === 'RESTABLECER_1'}
	<BotonVolver onclick={volverAConfiguracion} />
	<h1 tabindex="-1" bind:this={heading}>Borrar todo</h1>
	<h2>Vamos a borrar todos tus datos</h2>
	<p>Vas a perder tu perfil, tu historial de sesiones, el estado de tus ejercicios y el historial de dolor. La preferencia de sonido queda igual.</p>
	<p>Si quieres conservar una copia, exporta tus datos antes de seguir.</p>
	<div class="mt-6 flex flex-col gap-2">
		<!-- Reusa el handler de Exportar: APK abre el sheet de share con
		     el archivo adjunto, navegador descarga el blob. -->
		<Boton variante="primario" onclick={manejarExportar} deshabilitado={guardando}>Exportar primero</Boton>
		<Boton variante="secundario" onclick={() => { precargar('papelera'); subvista = 'RESTABLECER_2'; }} deshabilitado={guardando}>Seguir sin exportar</Boton>
	</div>
{:else if subvista === 'RESTABLECER_2'}
	<BotonVolver onclick={() => { errorEscritura = null; subvista = 'RESTABLECER_1'; }} />
	<h1 tabindex="-1" bind:this={heading}>Borrar todo</h1>
	<h2>¿Estás seguro?</h2>
	<p>No se puede deshacer. Borra todo y te lleva al registro inicial.</p>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex flex-col gap-2">
		<Boton variante="primario" onclick={confirmarRestablecer} deshabilitado={guardando} silencioso>Sí, borrar todo y empezar de cero</Boton>
		<Boton variante="secundario" onclick={volverAConfiguracion} deshabilitado={guardando}>No, conservar mis datos</Boton>
	</div>
{:else if subvista === 'AUDIO'}
	<BotonVolver onclick={() => { subvista = 'CONFIGURACION'; }} />
	<h1 tabindex="-1" bind:this={heading}>Sonido y música</h1>

	<section aria-labelledby="sec-audio-efectos" class="mt-4">
		<h2 id="sec-audio-efectos">Efectos</h2>
		<div class="flex flex-col gap-4">
			<button
				type="button"
				onclick={alternarSonidos}
				aria-label={sonidos ? 'Efectos: activados' : 'Efectos: desactivados'}
				class="clase-fila-configuracion"
			>
				<span>Efectos de sonido</span>
				<span class="text-text-secondary">{sonidos ? 'Activados' : 'Desactivados'}</span>
			</button>
			<!-- El <input type="range"> es inaccesible con TalkBack en WebView
			     (no anuncia el valor al cambiar, ajusta por porcentaje con
			     las teclas de volumen). Reusamos ContadorReps. Queda operable
			     aun con efectos apagados: el on/off es el interruptor maestro. -->
			<div>
				<ContadorReps
					bind:valor={volumenEfectosPct}
					min={0}
					max={100}
					paso={5}
					unidad="porcentaje"
					etiquetaGrupo="Volumen de efectos"
					etiquetaMenos="Bajar volumen de efectos"
					etiquetaMas="Subir volumen de efectos"
					onCambiar={onCambiarVolumenEfectos}
				/>
			</div>
		</div>
	</section>

	<section aria-labelledby="sec-audio-musica" class="mt-6">
		<h2 id="sec-audio-musica">Música</h2>
		<div class="flex flex-col gap-4">
			<button
				type="button"
				onclick={alternarMusica}
				aria-label={musica ? 'Música: activada' : 'Música: desactivada'}
				class="clase-fila-configuracion"
			>
				<span>Música de fondo</span>
				<span class="text-text-secondary">{musica ? 'Activada' : 'Desactivada'}</span>
			</button>
			<!-- El modulo de musica aplica el volumen al Audio sonando en vivo,
			     asi que el cambio se oye al toque sin muestra extra. -->
			<div>
				<ContadorReps
					bind:valor={volumenMusicaPct}
					min={0}
					max={100}
					paso={5}
					unidad="porcentaje"
					etiquetaGrupo="Volumen de música"
					etiquetaMenos="Bajar volumen de música"
					etiquetaMas="Subir volumen de música"
					onCambiar={onCambiarVolumenMusica}
				/>
			</div>
		</div>
	</section>
{/if}

<style>
	/* Mismo lenguaje visual que el Boton variante secundario. */
	.clase-fila-configuracion {
		min-height: 3rem;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-surface-alt);
		border: 1px solid var(--color-border-strong);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-weight: 500;
		text-align: left;
		transition: background-color 0.15s;
		touch-action: manipulation;
	}
	.clase-fila-configuracion:hover:not(:disabled) {
		background-color: var(--color-border);
	}
	.clase-fila-configuracion:active:not(:disabled) {
		filter: brightness(0.9);
	}
	.clase-fila-configuracion:focus {
		outline: none;
	}
	.clase-fila-configuracion:focus-visible {
		outline: 2px solid var(--color-acento);
		outline-offset: 2px;
	}
	.clase-fila-configuracion:disabled {
		opacity: 0.5;
	}
</style>
