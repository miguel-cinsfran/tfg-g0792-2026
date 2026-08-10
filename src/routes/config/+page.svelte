<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil, suscribirBloqueados } from '$lib/db/consultas';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara } from '$lib/errores/mensajes';
	import type { Perfil, EstadoEjercicio } from '$lib/motor/schema';
	import { etiquetaObjetivo } from '$lib/catalogo/etiquetas';
	import { M } from '$lib/mensajes/ui';
	import { manejarExportar as manejarExportarArchivo } from '$lib/importar/compartir';
	import { exportarDatos } from '$lib/importar/importar';
	import { pantallaEncendidaActivada, establecerPantallaEncendida } from '$lib/pantalla/despierta';
	import {
		consejosActivados as leerConsejosActivados,
		establecerConsejosActivados,
		anuncioConsejoActivado as leerAnuncioConsejoActivado,
		establecerAnuncioConsejoActivado
	} from '$lib/consejos/preferencias';
	import Boton from '$lib/components/Boton.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let bloqueados = $state<EstadoEjercicio[] | undefined>(undefined);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

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

	// Pantalla encendida (preferencia de dispositivo, localStorage).
	let pantallaEncendida = $state(pantallaEncendidaActivada());

	async function alternarPantalla() {
		pantallaEncendida = !pantallaEncendida;
		await establecerPantallaEncendida(pantallaEncendida);
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

	// La logica de exportacion vive en $lib/importar/compartir (rama
	// APK vs navegador). Este handler solo orquesta y traduce errores.
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
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	<p>{M.configuracion.indice.cargando}</p>
{:else if perfil === null}
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>{M.configuracion.indice.completarRegistro}</Boton>
{:else}
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.indice.titulo}</h1>

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
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/disponibilidad'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.diasYDuracion}</span>
				<span class="flex items-center gap-2 min-w-0">
					<span class="text-text-secondary truncate tabular-nums">{perfil.dias_semana} {perfil.dias_semana === 1 ? 'día' : 'días'}, {perfil.duracion_sesion_min} min</span>
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
				</span>
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/datos'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.plan.misDatos}</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
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
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
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
				<span class="text-text-secondary">{consejosActivados ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
			</button>
			{#if consejosActivados}
				<button
					type="button"
					onclick={alternarAnuncioConsejo}
					aria-label={anuncioConsejoActivado ? M.configuracion.indice.consejos.anunciarEstado.activado : M.configuracion.indice.consejos.anunciarEstado.desactivado}
					class="fila-configuracion"
				>
					<span>{M.configuracion.indice.consejos.anunciar}</span>
					<span class="text-text-secondary">{anuncioConsejoActivado ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
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
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-dolor" class="mt-6">
		<h2 id="sec-dolor">{M.configuracion.indice.dolor.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={() => goto(resolve('/config/dolor'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.dolor.zonasConDolor}</span>
				<span class="flex items-center gap-2 min-w-0">
					{#if bloqueados !== undefined && bloqueados.length > 0}
						<span class="text-text-secondary truncate tabular-nums">{bloqueados.length} {M.configuracion.indice.dolor.bloqueado(bloqueados.length)}</span>
					{/if}
					<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
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
				<span>{M.configuracion.indice.tusDatos.exportarMisDatos}</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
			<button
				type="button"
				onclick={() => goto(resolve('/config/importar'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.tusDatos.importarDatos}</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
			<!-- Doble confirmacion. Distinta de "Rehacer evaluacion" (que
			     borra solo el perfil y conserva historial/estados/dolor). -->
			<button
				type="button"
				onclick={() => goto(resolve('/config/borrar'))}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.tusDatos.borrarTodo}</span>
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	<section aria-labelledby="sec-general" class="mt-6">
		<h2 id="sec-general">{M.configuracion.indice.general.titulo}</h2>
		<div class="flex flex-col gap-2">
			<button
				type="button"
				onclick={alternarPantalla}
				aria-label={pantallaEncendida ? M.configuracion.indice.pantallaEncendida.activado : M.configuracion.indice.pantallaEncendida.desactivado}
				class="fila-configuracion"
			>
				<span>{M.configuracion.indice.general.mantenerPantallaEncendida}</span>
				<span class="text-text-secondary">{pantallaEncendida ? M.configuracion.indice.estado.activado : M.configuracion.indice.estado.desactivado}</span>
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
				<ChevronDerecha tamano={20} clase="text-text-secondary" />
			</button>
		</div>
	</section>

	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
{/if}
