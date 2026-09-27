<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import paquete from '../../../../package.json' with { type: 'json' };

	let heading = $state<HTMLElement>();
	const versionApp: string = paquete.version;

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.acerca.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.acerca.titulo}</h1>
</Cabecera>
<p>{M.configuracion.acerca.version(versionApp)}</p>
<p>{M.configuracion.acerca.hechaPor}</p>
<p>{M.configuracion.acerca.datosLocales}</p>
