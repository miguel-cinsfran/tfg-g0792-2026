<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import ImportarRespaldo from '$lib/components/ImportarRespaldo.svelte';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.importar.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.importar.titulo}</h1>
</Cabecera>
<p>{M.configuracion.importar.explicacion}</p>
<ImportarRespaldo etiquetaBoton={M.configuracion.importar.etiquetaBoton} onImportado={() => goto(resolve('/perfil'))} />
