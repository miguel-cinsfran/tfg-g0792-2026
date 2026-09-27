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
		enLinea = false,
		etiqueta,
		id,
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
		// enLinea deja el boton a su medida; solo para controles en linea
		// (mas y menos del contador). Por defecto ocupa todo el ancho.
		enLinea?: boolean;
		// Nombre accesible cuando el contenido visible no lo da (ej. los
		// signos del contador, decorativos con aria-hidden).
		etiqueta?: string;
		// Id para mover el foco programaticamente (ej. tras "No puedo").
		id?: string;
	} = $props();

	// `disabled` saca al boton del arbol de accesibilidad y le tira el foco;
	// con `aria-disabled` el corte del clic es responsabilidad nuestra.
	function handleClick(event: MouseEvent) {
		if (deshabilitado) {
			event.preventDefault();
			return;
		}
		if (!silencioso) {
			sonar('seleccion');
		}
		onclick?.();
	}

	const claseBase =
		'min-h-12 min-w-12 rounded-lg px-4 transition-colors active:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface aria-disabled:opacity-50 touch-manipulation';

	const clases = $derived(
		`${
			variante === 'primario'
				? `${claseBase} bg-accion hover:bg-accion-hover text-sobre-accion border-2 border-accion-borde font-bold`
				: `${claseBase} bg-surface-alt border border-border-strong text-text-primary font-medium hover:bg-border`
		}${enLinea ? ' w-auto' : ' w-full'}${tamano === 'grande' ? ' py-4 text-lg' : ''}`
	);
</script>

<button {type} {id} onclick={(event) => handleClick(event)} aria-disabled={deshabilitado || undefined} aria-label={etiqueta} class={clases}>
	{#if avance}
		<span class="inline-flex items-center justify-center gap-2">
			{@render children()}
			<FlechaDerecha />
		</span>
	{:else}
		{@render children()}
	{/if}
</button>