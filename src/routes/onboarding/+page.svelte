<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { pasoPendiente } from '$lib/onboarding/estado';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	$effect(() => {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pasoPendiente devuelve rutas internas conocidas
		goto(pasoPendiente(), { replaceState: true });
	});
</script>

<svelte:head><title>Registro</title></svelte:head>
<h1 tabindex="-1" bind:this={heading}>Registro</h1>
<p>Cargando...</p>