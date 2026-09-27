<!--
  El botón va antes del h1 en el orden del DOM, no solo en la
  presentación: con lector de pantalla se navega por gestos y la
  posición física es el orden. Regla de docs/convenciones-ui.md.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';

	let {
		onclick,
		etiqueta,
		children,
	}: {
		onclick: () => void;
		etiqueta?: string;
		children: Snippet;
	} = $props();
</script>

<header class="cabecera flex items-start gap-3 mb-4">
	<BotonVolver {onclick} {etiqueta} />
	{@render children()}
</header>

<style>
	/* El h1 de la pantalla ocupa el resto de la fila y puede envolver
	   sin desbordar; el espaciado con el contenido lo da la propia barra. */
	.cabecera :global(h1) {
		flex: 1;
		min-width: 0;
		margin: 0;
	}
</style>
