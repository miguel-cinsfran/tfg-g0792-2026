<script lang="ts">
	import type { Snippet } from 'svelte';
	import FlechaDerecha from '$lib/components/iconos/FlechaDerecha.svelte';
	import { sonar } from '$lib/sonido/reproducir';

	let {
		children,
		onclick,
		variante = 'primario',
		tamano = 'normal',
		deshabilitado = false,
		type = 'button',
		avance = false,
		silencioso = false,
	}: {
		children: Snippet;
		onclick?: () => void;
		variante?: 'primario' | 'secundario';
		// 'grande': la accion principal de una pantalla (ancho completo).
		tamano?: 'normal' | 'grande';
		deshabilitado?: boolean;
		type?: 'button' | 'submit';
		avance?: boolean;
		// silencioso evita el sonido de activacion cuando el handler ya
		// dispara su propio sonido (ej. sesion-completada, inicio-serie).
		silencioso?: boolean;
	} = $props();

	function handleClick() {
		if (!silencioso) {
			sonar('seleccion');
		}
		onclick?.();
	}

	const claseBase =
		'min-h-12 min-w-12 rounded-lg px-4 font-medium transition-colors active:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 touch-manipulation';

	const clases = $derived(
		`${
			variante === 'primario'
				? `${claseBase} bg-acento hover:bg-acento-hover text-surface`
				: `${claseBase} bg-surface-alt border border-border-strong text-text-primary hover:bg-border`
		}${tamano === 'grande' ? ' w-full py-4 text-lg' : ''}`
	);
</script>

<button {type} onclick={handleClick} disabled={deshabilitado} class={clases}>
	{#if avance}
		<span class="inline-flex items-center justify-center gap-2">
			{@render children()}
			<FlechaDerecha />
		</span>
	{:else}
		{@render children()}
	{/if}
</button>