<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil, suscribirBloqueados } from '$lib/db/consultas';
	import { actualizarPerfil } from '$lib/db/perfil';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import type { Perfil, EstadoEjercicio, Zona } from '$lib/motor/schema';
	import { etiquetaObjetivo, etiquetaZona } from '$lib/catalogo/etiquetas';
	import { M } from '$lib/mensajes/ui';
	import { manejarExportar as manejarExportarArchivo } from '$lib/importar/compartir';
	import { exportarDatos } from '$lib/importar/importar';
	import { pantallaEncendidaActivada, establecerPantallaEncendida } from '$lib/pantalla/despierta';
	import { leerAspecto, etiquetaAspecto } from '$lib/aspecto/aspecto';
	import {
		consejosActivados as leerConsejosActivados,
		establecerConsejosActivados,
		anuncioConsejoActivado as leerAnuncioConsejoActivado,
		establecerAnuncioConsejoActivado
	} from '$lib/consejos/preferencias';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Interruptor from '$lib/components/Interruptor.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let bloqueados = $state<EstadoEjercicio[] | undefined>(undefined);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	function volver() {
		goto(resolve('/perfil'));
	}

	// Ventana de opciones de días y duración: elegir aplica al instante
	// y cierra; el Atrás del sistema la cierra sin cambiar nada (el
	// Modal atiende 'volveratras'). El foco vuelve a la fila elegida.
	const DIAS = [2, 3, 4, 5];
	const DURACIONES = [20, 30, 45];

	let ventana: 'dias' | 'duracion' | null = $state(null);
	let diasElegidos = $state<string | null>(null);
	let duracionElegida = $state<string | null>(null);
	let errorDisponibilidad = $state<string | null>(null);
	let filaDias = $state<HTMLButtonElement>();
	let filaDuracion = $state<HTMLButtonElement>();

	function abrirDisponibilidad(cual: 'dias' | 'duracion') {
		if (perfil === null || perfil === undefined) return;
		errorDisponibilidad = null;
		if (cual === 'dias') diasElegidos = String(perfil.dias_semana);
		else duracionElegida = String(perfil.duracion_sesion_min);
		ventana = cual;
	}

	function cerrarDisponibilidad() {
		ventana = null;
	}

	$effect(() => {
		const elegidos = diasElegidos;
		if (ventana !== 'dias' || elegidos === null || perfil === null || perfil === undefined) return;
		if (Number(elegidos) === perfil.dias_semana) return;
		void aplicarDias(Number(elegidos));
	});

	$effect(() => {
		const elegida = duracionElegida;
		if (ventana !== 'duracion' || elegida === null || perfil === null || perfil === undefined) return;
		if (Number(elegida) === perfil.duracion_sesion_min) return;
		void aplicarDuracion(Number(elegida));
	});

	async function aplicarDias(dias: number) {
		errorDisponibilidad = null;
		try {
			await actualizarPerfil({ dias_semana: dias });
			avisar(M.configuracion.disponibilidad.avisoDias(dias), 'exito');
			ventana = null;
			await tick();
			filaDias?.focus();
		} catch (e) {
			errorDisponibilidad = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorDisponibilidad);
		}
	}

	async function aplicarDuracion(minutos: number) {
		errorDisponibilidad = null;
		try {
			await actualizarPerfil({ duracion_sesion_min: minutos });
			avisar(M.configuracion.disponibilidad.avisoDuracion(minutos), 'exito');
			ventana = null;
			await tick();
			filaDuracion?.focus();
		} catch (e) {
			errorDisponibilidad = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorDisponibilidad);
		}
	}

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	$effect(() => {
		return suscribirBloqueados(
			(v) => { bloqueados = v; },
			(m) => { errorLectura = m; }
		);
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Aspecto (preferencia de dispositivo, localStorage): la fila muestra
	// la etiqueta de la opcion guardada, como los ajustes de Android.
	let aspecto = $state(leerAspecto());

	// Pantalla encendida (preferencia de dispositivo, localStorage).
	let pantallaEncendida = $state(pantallaEncendidaActivada());

	async function alternarPantalla() {
		pantallaEncendida = !pantallaEncendida;
		establecerPantallaEncendida(pantallaEncendida);
		avisar(pantallaEncendida ? M.configuracion.indice.pantallaEncendidaAviso.activado : M.configuracion.indice.pantallaEncendidaAviso.desactivado, 'exito');
	}

	// Consejos (preferencia de dispositivo, localStorage). La segunda fila
	// se lee al renderizar: al reactivar la primera reaparece con su estado previo.
	let consejosActivados = $state(leerConsejosActivados());
	let anuncioConsejoActivado = $state(leerAnuncioConsejoActivado());

	async function alternarConsejos() {
		consejosActivados = !consejosActivados;
		await establecerConsejosActivados(consejosActivados);
		avisar(consejosActivados ? M.configuracion.indice.consejos.mostrarAviso.activado : M.configuracion.indice.consejos.mostrarAviso.desactivado, 'exito');
	}

	async function alternarAnuncioConsejo() {
		anuncioConsejoActivado = !anuncioConsejoActivado;
		await establecerAnuncioConsejoActivado(anuncioConsejoActivado);
		avisar(anuncioConsejoActivado ? M.configuracion.indice.consejos.anunciarAviso.activado : M.configuracion.indice.consejos.anunciarAviso.desactivado, 'exito');
	}

	// La fila de dolor nombra las zonas declaradas y, si hay ejercicios
	// en pausa por dolor reportado en sesión, una segunda línea con el
	// conteo. Sin nada declarado dice "ninguna" y sin segunda línea.
	function detalleZonasDolor(): string {
		const zonas: Zona[] = perfil?.zonas_dolor_preexistente ?? [];
		if (zonas.length === 0) return M.configuracion.dolor.ninguna;
		return zonas.map((z) => etiquetaZona(z).toLowerCase()).join(', ');
	}

	function etiquetaFilaDolor(): string {
		const base = M.configuracion.indice.dolor.zonasFila(detalleZonasDolor());
		if (bloqueados !== undefined && bloqueados.length > 0) {
			return `${base} ${M.configuracion.indice.dolor.enPausa(bloqueados.length)}`;
		}
		return base;
	}

	async function manejarExportar() {
		if (guardando) return;
		guardando = true;
		errorEscritura = null;
		try {
			const datos = await exportarDatos();
			const json = JSON.stringify(datos, null, 2);
			await manejarExportarArchivo(json, datos.perfil?.nombre ?? 'usuario', Date.now());
			avisar(M.configuracion.indice.copiaGuardada, 'exito');
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ');
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}
</script>

<svelte:head><title>{M.configuracion.indice.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.indice.cargando}</p>
{:else if perfil === null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	</Cabecera>
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>{M.configuracion.indice.completarRegistro}</Boton>
{:else}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	</Cabecera>

	<section aria-labelledby="sec-plan" class="mt-4">
		<h2 id="sec-plan">{M.configuracion.indice.plan.titulo}</h2>
		<div class="flex flex-col gap-2">
			<!-- Como los ajustes de Android: la fila nombra el dato y muestra
			     el valor actual; el verbo sobra. -->
			<button
				type="button"
				onclick={() => goto(resolve('/config/objetivo'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.objetivo}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate">{etiquetaObjetivo(perfil.objetivo)}</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				bind:this={filaDias}
				onclick={() => abrirDisponibilidad('dias')}
				aria-label={M.configuracion.indice.plan.diasFila(perfil.dias_semana)}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.diasPorSemana}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate tabular-nums">{perfil.dias_semana}</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				bind:this={filaDuracion}
				onclick={() => abrirDisponibilidad('duracion')}
				aria-label={M.configuracion.indice.plan.duracionFila(perfil.duracion_sesion_min)}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.duracion}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate tabular-nums">{M.configuracion.indice.plan.duracionCorta(perfil.duracion_sesion_min)}</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/datos'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.tusDatos}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/equipamiento'))}
				aria-label={M.perfil.resumen.equipo(perfil.tiene_anclaje)}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.equipo}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary text-right">{M.configuracion.indice.plan.equipoValor(perfil.tiene_anclaje)}</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-audio" class="mt-6">
		<h2 id="sec-audio">{M.configuracion.indice.sonidoYMusica.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => goto(resolve('/config/audio'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.sonidoYMusica.efectosYMusica}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-consejos" class="mt-6">
		<h2 id="sec-consejos">{M.configuracion.indice.consejos.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={alternarConsejos}
				aria-label={consejosActivados ? M.configuracion.indice.consejos.mostrarEstado.activado : M.configuracion.indice.consejos.mostrarEstado.desactivado}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.consejos.mostrar}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary">{consejosActivados ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
					<Interruptor activado={consejosActivados} />
				</span>
			</button>
			{#if consejosActivados}
				<button
					type="button"
					onclick={alternarAnuncioConsejo}
					aria-label={anuncioConsejoActivado ? M.configuracion.indice.consejos.anunciarEstado.activado : M.configuracion.indice.consejos.anunciarEstado.desactivado}
					class="fila-configuracion"
				>
					<span>{M.configuracion.indice.consejos.anunciar}</span>
					<span class="flex items-center gap-2 min-w-0">
						<span class="text-text-secondary">{anuncioConsejoActivado ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
						<Interruptor activado={anuncioConsejoActivado} />
					</span>
				</button>
			{/if}
		</div>
	</section>

	<section aria-labelledby="sec-evaluacion" class="mt-6">
		<h2 id="sec-evaluacion">{M.configuracion.indice.tuEvaluacion.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => goto(resolve('/config/rehacer'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.tuEvaluacion.volverAHacerEvaluacion}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-dolor" class="mt-6">
		<h2 id="sec-dolor">{M.configuracion.indice.dolor.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => goto(resolve('/config/dolor'))}
				aria-label={etiquetaFilaDolor()}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.dolor.zonasConDolor}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="min-w-0 text-right">
						<span class="block truncate text-text-secondary">{detalleZonasDolor()}</span>
						{#if bloqueados !== undefined && bloqueados.length > 0}
							<span class="block text-sm text-text-secondary tabular-nums">{M.configuracion.indice.dolor.enPausa(bloqueados.length)}</span>
						{/if}
					</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-datos" class="mt-6">
		<h2 id="sec-datos">{M.configuracion.indice.tusDatos.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={manejarExportar}
				aria-disabled={guardando || undefined}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.tusDatos.exportarTusDatos}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/importar'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.tusDatos.importarDatos}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
			<!-- Acción destructiva: texto e ícono en el color de error del
			     tema, al final de su sección. Doble confirmación en otra
			     pantalla, distinta de "Rehacer evaluación" (que borra solo
			     el perfil y conserva historial, estados y dolor). -->
			<button
				type="button"
				onclick={() => goto(resolve('/config/borrar'))}
				class="fila-configuracion"
			>
				<span class="text-error">{M.configuracion.indice.tusDatos.borrarTodo}</span>
				<ChevronDerecha tamano="1.25em" clase="text-error shrink-0" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-general" class="mt-6">
		<h2 id="sec-general">{M.configuracion.indice.general.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => goto(resolve('/config/aspecto'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.aspecto.titulo}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate">{etiquetaAspecto(aspecto)}</span>
					<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={alternarPantalla}
				aria-label={pantallaEncendida ? M.configuracion.indice.pantallaEncendida.activado : M.configuracion.indice.pantallaEncendida.desactivado}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.general.mantenerPantallaEncendida}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary">{pantallaEncendida ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
					<Interruptor activado={pantallaEncendida} />
				</span>
			</button>
		</div>
	</section>

	<!-- La ayuda cierra la lista, como en los ajustes de Android. -->
	<section aria-labelledby="sec-informacion" class="mt-6">
		<h2 id="sec-informacion">{M.configuracion.indice.informacion.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta interna resuelta, solo se agrega el query
					goto(`${resolve('/ayuda')}?de=config`);
				}}
				class="fila-configuracion"
			>
				<span>Ayuda</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/acerca'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.informacion.acercaDe}</span>
				<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
			</button>
		</div>
	</section>

	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}

	<Modal
		abierto={ventana !== null}
		titulo={ventana === 'duracion' ? M.configuracion.disponibilidad.duracionSesion : M.configuracion.disponibilidad.eligeLosDias}
		alCerrar={cerrarDisponibilidad}
	>
		{#if ventana === 'dias' && diasElegidos !== null}
			<GrupoSeleccion
				leyenda={M.configuracion.disponibilidad.eligeLosDias}
				nombre="dias-config"
				opciones={DIAS.map((d) => ({ valor: String(d), etiqueta: M.configuracion.disponibilidad.opcionDias(d) }))}
				bind:valor={diasElegidos}
				id="grupo-dias-config"
			/>
		{:else if ventana === 'duracion' && duracionElegida !== null}
			<GrupoSeleccion
				leyenda={M.configuracion.disponibilidad.duracionSesion}
				nombre="duracion-config"
				opciones={DURACIONES.map((d) => ({ valor: String(d), etiqueta: M.configuracion.disponibilidad.opcionDuracion(d) }))}
				bind:valor={duracionElegida}
				id="grupo-duracion-config"
			/>
		{/if}
		{#if errorDisponibilidad !== null}
			<p>{errorDisponibilidad}</p>
		{/if}
	</Modal>
{/if}
