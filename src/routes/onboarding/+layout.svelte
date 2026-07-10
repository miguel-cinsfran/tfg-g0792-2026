<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { progresoOnboarding } from '$lib/onboarding/estado';
	import ProgresoOnboarding from '$lib/components/ProgresoOnboarding.svelte';

	let { children }: { children: Snippet } = $props();

	const progreso = $derived(progresoOnboarding(page.url.pathname));
</script>

{#if progreso}
	<div class="mb-6">
		<ProgresoOnboarding paso={progreso.paso} total={progreso.total} />
	</div>
{/if}

{@render children()}
