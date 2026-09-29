<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// La ayuda se abre desde la lista de Configuración y desde el resumen del onboarding.
	// La lista de configuración marca el origen con ?de=config: su
	// retorno va a /config (la lista cuelga de ahí); cualquier otro
	// origen alcanza el historial.
	function volver() {
		if (page.url.searchParams.get('de') === 'config') {
			goto(resolve('/config'));
		} else {
			history.back();
		}
	}

	// El tema hereda el origen: su Atrás vuelve al índice y el índice
	// al suyo, así el camino de vuelta no se corta a mitad.
	function irAlTema(id: string) {
		if (page.url.searchParams.get('de') === 'config') {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta interna resuelta, solo se conserva el origen
			goto(`${resolve('/ayuda/[tema]', { tema: id })}?de=config`);
		} else {
			goto(resolve('/ayuda/[tema]', { tema: id }));
		}
	}
</script>

<svelte:head><title>{M.ayuda.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.ayuda.titulo}</h1>
</Cabecera>

<!-- Índice por grupos: cada tema es una fila que lleva a su pantalla.
     Un grupo sin temas no se muestra. -->
{#each M.ayuda.grupos as grupo, i (grupo.id)}
	{#if grupo.temas.length > 0}
		<section aria-labelledby={grupo.id} class={i === 0 ? 'mt-4' : 'mt-6'}>
			<h2 id={grupo.id}>{grupo.titulo}</h2>
			<div class="flex flex-col gap-2">
				{#each grupo.temas as id (id)}
					<button type="button" onclick={() => irAlTema(id)} class="fila-configuracion">
						<span class="flex-1">{M.ayuda.temas[id].titulo}</span>
						<ChevronDerecha tamano="1.25em" clase="text-text-secondary" />
					</button>
				{/each}
			</div>
		</section>
	{/if}
{/each}
