<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_LECTURA_FALLIDA } from '$lib/errores/mensajes';
	import { exportarDatos } from '$lib/importar/importar';
	import { manejarExportar as manejarExportarArchivo } from '$lib/importar/compartir';
	import { precargar } from '$lib/sonido/reproducir';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function exportarPrimero() {
		guardando = true;
		errorEscritura = null;
		try {
			const datos = await exportarDatos();
			const json = JSON.stringify(datos, null, 2);
			await manejarExportarArchivo(json, datos.perfil?.nombre ?? 'usuario', Date.now());
			avisar(M.configuracion.indice.copiaGuardada, 'exito');
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_LECTURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	function seguirSinExportar() {
		precargar('papelera');
		goto(resolve('/config/borrar/confirmar'));
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.borrar.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.borrar.titulo}</h1>
</Cabecera>
<h2>{M.configuracion.borrar.avisoBorrar}</h2>
<p>{M.configuracion.borrar.explicacion}</p>
<p>{M.configuracion.borrar.sugerenciaExportar}</p>
{#if errorEscritura !== null}
	<p>{errorEscritura}</p>
{/if}
<div class="mt-6 flex flex-col gap-2">
	<Boton variante="secundario" onclick={seguirSinExportar} deshabilitado={guardando}>{M.configuracion.borrar.botonSeguirSinExportar}</Boton>
	<!-- Reusa el handler de Exportar: APK abre el sheet de share con
	     el archivo adjunto, navegador descarga el blob. -->
	<Boton variante="primario" onclick={exportarPrimero} deshabilitado={guardando}>{M.configuracion.borrar.botonExportarPrimero}</Boton>
</div>
