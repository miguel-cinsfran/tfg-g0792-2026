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
</script>

<svelte:head><title>{M.ayuda.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.ayuda.titulo}</h1>
</Cabecera>

<!-- name comun: acordeon nativo, al abrir un tema se cierra el resto.
     Si la WebView no lo soporta, degradan a independientes. -->
<div class="flex flex-col gap-2 mt-4">
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.vibracionTitulo}</h2></summary>
		<p>{M.ayuda.vibracionTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.chequeoTitulo}</h2></summary>
		<p>{M.ayuda.chequeoTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.rachaTitulo}</h2></summary>
		<p>{M.ayuda.rachaTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.sonidosTitulo}</h2></summary>
		<p>{M.ayuda.sonidosTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.reanudarTitulo}</h2></summary>
		<p>{M.ayuda.reanudarTexto}</p>
	</details>
	<details class="clase-tema-ayuda desplegable desplegable-fila" name="tema-ayuda">
		<summary><h2>{M.ayuda.nivelTitulo}</h2></summary>
		<p>{M.ayuda.nivelTexto}</p>
	</details>
</div>

<style>
	/* Marca de acento a la izquierda cuando el tema esta abierto. Va
	   absoluta sobre el relleno para no mover la sangria del texto, que
	   iguala a la fila de configuracion. El chevron viene de .desplegable. */
	.clase-tema-ayuda > summary::before {
		content: '';
		position: absolute;
		left: 0.375rem;
		top: 0.75rem;
		bottom: 0.75rem;
		width: 0.25rem;
		background-color: transparent;
		border-radius: 0.125rem;
		transition: background-color 0.15s;
	}
	.clase-tema-ayuda[open] > summary::before {
		background-color: var(--color-acento);
	}
</style>
