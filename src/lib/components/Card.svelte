<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		titulo,
		children,
	}: {
		titulo?: string;
		children: Snippet;
	} = $props();
</script>

{#if titulo}
	<section class="bg-surface-alt border-2 border-borde-bloque rounded-lg p-4">
		<!-- Sin margen superior: la regla base de h2 ya suma su margen al
		     relleno de la tarjeta y quedaba el doble de aire arriba. -->
		<h2 class="text-lg font-semibold text-text-primary mt-0 mb-2">{titulo}</h2>
		{@render children()}
	</section>
{:else}
	<div class="bg-surface-alt border-2 border-borde-bloque rounded-lg p-4">
		{@render children()}
	</div>
{/if}
