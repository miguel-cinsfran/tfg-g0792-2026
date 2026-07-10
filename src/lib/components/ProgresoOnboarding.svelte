<script lang="ts">
	let { paso, total }: { paso: number; total: number } = $props();
	const porcentaje = $derived(total > 0 ? Math.min(100, (paso / total) * 100) : 0);
</script>

<p class="mb-3 text-sm text-text-secondary">
	Paso {paso} de {total}
</p>

<div
	class="h-1 w-full rounded-full bg-border overflow-hidden"
	aria-hidden="true"
>
	<div class="h-full bg-acento" style:width="{porcentaje}%"></div>
</div>
