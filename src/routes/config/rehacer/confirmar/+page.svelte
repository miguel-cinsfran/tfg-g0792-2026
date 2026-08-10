<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import { borrarPerfil } from '$lib/db/perfil';
	import { sonar } from '$lib/sonido/reproducir';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function confirmar() {
		guardando = true;
		errorEscritura = null;
		try {
			await borrarPerfil();
			sonar('re-evaluar');
			avisar(M.configuracion.rehacerConfirmar.avisoBorrado, 'exito');
			goto(resolve('/onboarding'));
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	function volverAlPasoAnterior() {
		goto(resolve('/config/rehacer'));
	}

	function conservar() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.rehacerConfirmar.titulo}</title></svelte:head>

<Cabecera onclick={volverAlPasoAnterior}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.rehacerConfirmar.titulo}</h1>
</Cabecera>
<h2>{M.configuracion.rehacerConfirmar.estasSeguro}</h2>
<p>{M.configuracion.rehacerConfirmar.noSePuedeDeshacer}</p>
{#if errorEscritura !== null}
	<p>{errorEscritura}</p>
{/if}
<div class="mt-6 flex flex-col gap-2">
	<Boton variante="secundario" onclick={conservar} deshabilitado={guardando}>{M.configuracion.rehacerConfirmar.botonConservar}</Boton>
	<Boton variante="primario" onclick={confirmar} deshabilitado={guardando} silencioso>{M.configuracion.rehacerConfirmar.botonConfirmar}</Boton>
</div>
