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
	<section class="bg-surface-alt border border-border rounded-lg p-4">
		<h2 class="text-lg font-semibold text-text-primary mb-2">{titulo}</h2>
		{@render children()}
	</section>
{:else}
	<div class="bg-surface-alt border border-border rounded-lg p-4">
		{@render children()}
	</div>
{/if}