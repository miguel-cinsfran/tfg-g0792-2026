<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Id desconocido o ausente rinde el aviso, nunca una pantalla vacía.
	let tema = $derived(M.ayuda.temas[page.params.tema ?? ''] ?? null);

	// Vuelve siempre al índice, no al historial: el tema solo se abre
	// desde ahí. Conserva el origen del índice para no cortar su
	// propio camino de vuelta a Configuración.
	function volver() {
		if (page.url.searchParams.get('de') === 'config') {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta interna resuelta, solo se conserva el origen
			goto(`${resolve('/ayuda')}?de=config`);
		} else {
			goto(resolve('/ayuda'));
		}
	}
</script>

<svelte:head><title>{tema?.titulo ?? M.ayuda.noEncontradoTitulo}</title></svelte:head>

{#if tema !== null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{tema.titulo}</h1>
	</Cabecera>
	<!-- Un bloque con `texto` es un párrafo; uno con `pasos`, los
	     pasos numerados del tema. Sin texto oculto. -->
	{#each tema.bloques as bloque, j (j)}
		{#if 'texto' in bloque}
			<p>{bloque.texto}</p>
		{:else}
			<ol>
				{#each bloque.pasos as paso, k (k)}
					<li>{paso}</li>
				{/each}
			</ol>
		{/if}
	{/each}
{:else}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.ayuda.noEncontradoTitulo}</h1>
	</Cabecera>
	<p>{M.ayuda.noEncontradoTexto}</p>
{/if}
