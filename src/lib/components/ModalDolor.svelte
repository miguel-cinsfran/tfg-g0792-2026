<script lang="ts">
	import type { Snippet } from 'svelte';
	import Boton from './Boton.svelte';

	let {
		abierto,
		titulo,
		alCerrar,
		children,
		acciones,
	}: {
		abierto: boolean;
		titulo: string;
		alCerrar: () => void;
		children: Snippet;
		// Botones propios del dialogo (confirmar/cancelar). Si no se
		// proveen, queda el "Volver" de siempre.
		acciones?: Snippet;
	} = $props();

	let elementoPrevio: HTMLElement | null = $state(null);
	let abiertoAnterior = $state(false);
	const idDialogo = crypto.randomUUID();

	function manejarTeclado(e: KeyboardEvent): void {
		if (!abierto) return;
		if (e.key === 'Escape') {
			alCerrar();
			return;
		}
		if (e.key !== 'Tab') return;

		const dialogo = document.getElementById(idDialogo);
		if (!dialogo) return;

		const focusables = dialogo.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		if (focusables.length === 0) return;

		const primero = focusables[0];
		const ultimo = focusables[focusables.length - 1];
		const indice = Array.prototype.indexOf.call(focusables, document.activeElement);

		// Trap solo en los bordes: en el medio decide el navegador con su
		// Tab nativo. indice -1 = foco en el h2 (tabindex -1): hacia
		// adelante fuerza el primero, hacia atras envuelve al ultimo.
		if (e.shiftKey) {
			if (indice <= 0) {
				e.preventDefault();
				ultimo.focus();
			}
		} else if (indice === -1 || indice === focusables.length - 1) {
			e.preventDefault();
			primero.focus();
		}
	}

	// Boton atras de Android (lo emite el layout como evento cancelable):
	// con el modal abierto, atras cierra el modal en vez de navegar.
	$effect(() => {
		const manejarVolverAtras = (e: Event): void => {
			if (!abierto) return;
			e.preventDefault();
			alCerrar();
		};
		window.addEventListener('volveratras', manejarVolverAtras);
		return () => window.removeEventListener('volveratras', manejarVolverAtras);
	});

	// Solo actuar en transiciones, no en cada re-run.
	$effect(() => {
		if (abierto && !abiertoAnterior) {
			elementoPrevio = document.activeElement as HTMLElement;
			const h2 = document.getElementById(idDialogo)?.querySelector('h2');
			h2?.focus();
		} else if (!abierto && abiertoAnterior) {
			elementoPrevio?.focus();
			elementoPrevio = null;
		}
		abiertoAnterior = abierto;
	});
</script>

<svelte:window onkeydown={manejarTeclado} />

{#if abierto}
	<!-- Overlay -->
	<div class="fixed inset-0 bg-black/60 z-40" aria-hidden="true"></div>

	<!-- Dialog -->
	<div
		id={idDialogo}
		role="dialog"
		aria-modal="true"
		aria-labelledby="{idDialogo}-titulo"
		class="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface-raised border border-border rounded-lg p-6 max-w-lg mx-auto max-h-[80svh] overflow-y-auto"
	>
		<h2 id="{idDialogo}-titulo" tabindex="-1" class="text-xl font-semibold text-text-primary mb-4">
			{titulo}
		</h2>
		<div class="mb-4">
			{@render children()}
		</div>
		{#if acciones}
			<div class="flex flex-col gap-2">
				{@render acciones()}
			</div>
		{:else}
			<Boton variante="secundario" onclick={alCerrar}>Volver</Boton>
		{/if}
	</div>
{/if}