<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import BotonVolver from '$lib/components/BotonVolver.svelte';

	let heading = $state<HTMLElement>();

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// La ayuda se abre desde config y desde el resumen del onboarding.
	// Config pasa ?de=config para volver a la lista de configuracion
	// (la subvista interna no sobrevive a un history.back); para el
	// resto alcanza el historial.
	function volver() {
		if (page.url.searchParams.get('de') === 'config') {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- ruta interna resuelta, solo se agrega el query
			goto(`${resolve('/config')}?vista=configuracion`);
		} else {
			history.back();
		}
	}
</script>

<svelte:head><title>{M.ayuda.titulo}</title></svelte:head>

<BotonVolver onclick={volver} />

<h1 tabindex="-1" bind:this={heading}>{M.ayuda.titulo}</h1>

<!-- name comun: acordeon nativo, al abrir un tema se cierra el resto.
     Si la WebView no lo soporta, degradan a independientes. -->
<div class="flex flex-col gap-2 mt-4">
	<details class="clase-tema-ayuda desplegable" name="tema-ayuda">
		<summary>{M.ayuda.vibracionTitulo}</summary>
		<p>{M.ayuda.vibracionTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable" name="tema-ayuda">
		<summary>{M.ayuda.chequeoTitulo}</summary>
		<p>{M.ayuda.chequeoTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable" name="tema-ayuda">
		<summary>{M.ayuda.rachaTitulo}</summary>
		<p>{M.ayuda.rachaTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable" name="tema-ayuda">
		<summary>{M.ayuda.sonidosTitulo}</summary>
		<p>{M.ayuda.sonidosTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable" name="tema-ayuda">
		<summary>{M.ayuda.reanudarTitulo}</summary>
		<p>{M.ayuda.reanudarTexto}</p>
	</details>
</div>

<style>
	/* Lista desplegable nativa (<details>/<summary>) con marker visual
	   de acento en el borde izquierdo cuando esta abierta. El chevron
	   indicador viene de la clase global .desplegable (app.css). */
	.clase-tema-ayuda {
		background-color: var(--color-surface-alt);
		border: 1px solid var(--color-border-strong);
		border-radius: 0.5rem;
	}
	.clase-tema-ayuda > summary {
		min-height: 3rem;
		padding: 0.75rem 2.25rem 0.75rem 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		touch-action: manipulation;
		user-select: none;
	}
	.clase-tema-ayuda > summary::-webkit-details-marker {
		display: none;
	}
	.clase-tema-ayuda > summary::before {
		content: '';
		display: inline-block;
		width: 0.25rem;
		align-self: stretch;
		background-color: transparent;
		border-radius: 0.125rem;
		margin-right: 0.75rem;
		transition: background-color 0.15s;
	}
	.clase-tema-ayuda[open] > summary::before {
		background-color: var(--color-acento);
	}
	.clase-tema-ayuda > summary:focus {
		outline: none;
	}
	.clase-tema-ayuda > summary:focus-visible {
		outline: 2px solid var(--color-acento);
		outline-offset: 2px;
		border-radius: 0.5rem;
	}
	.clase-tema-ayuda > p {
		padding: 0 1rem 0.75rem 1rem;
		margin: 0;
		color: var(--color-text-primary);
	}
</style>
