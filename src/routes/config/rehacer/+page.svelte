<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { precargar } from '$lib/sonido/reproducir';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function continuar() {
		precargar('re-evaluar');
		goto(resolve('/config/rehacer/confirmar'));
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.rehacer.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.rehacer.titulo}</h1>
</Cabecera>
<p>{M.configuracion.rehacer.explicacion}</p>
<div class="mt-6 flex flex-col gap-2">
	<Boton variante="primario" onclick={continuar}>{M.configuracion.rehacer.botonContinuar}</Boton>
</div>
