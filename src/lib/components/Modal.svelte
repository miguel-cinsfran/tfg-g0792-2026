<script lang="ts">
	import type { Snippet } from 'svelte';
	import Boton from './Boton.svelte';
	import Equis from './iconos/Equis.svelte';
	import { M } from '$lib/mensajes/ui';

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
	let zonaContenido = $state<HTMLElement>();
	// true cuando queda contenido sin mostrar debajo: el pie lleva sombra.
	let hayMasAbajo = $state(false);

	function actualizarSombra(): void {
		const zona = zonaContenido;
		if (!zona) {
			hayMasAbajo = false;
			return;
		}
		// Tolerancia de 4 px: el redondeo de subpixeles no es "contenido".
		hayMasAbajo = zona.scrollHeight - zona.scrollTop - zona.clientHeight > 4;
	}

	$effect(() => {
		if (abierto) actualizarSombra();
	});

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

	// Solo actuar en transiciones, no en cada re-run. El cleanup cubre el
	// cierre por DESTRUCCION: las pantallas montan el Modal dentro de un
	// {#if}, asi que al cerrar el componente muere sin recibir
	// abierto = false. Se restaura solo si el elemento previo sigue en el
	// documento: si la pantalla entera navego, el foco de la pantalla
	// nueva gana, y pelear con el seria robarle el foco al recien llegado.
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
		return () => {
			if (abierto && elementoPrevio?.isConnected) {
				elementoPrevio.focus();
			}
		};
	});
</script>

<svelte:window onkeydown={manejarTeclado} onresize={actualizarSombra} />

{#if abierto}
	<!-- Overlay -->
	<div class="fixed inset-0 bg-black/60 z-40" aria-hidden="true"></div>

	<!-- Dialog: columna fija (encabezado + pie siempre visibles) con el
	     contenido scrolleando en el medio. El alto maximo deja libre la
	     zona de la barra de accion, que publica su medida en
	     --alto-barra-accion (0 px donde no hay barra). -->
	<div
		id={idDialogo}
		role="dialog"
		aria-modal="true"
		aria-labelledby="{idDialogo}-titulo"
		class="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-surface-alt border border-border rounded-lg max-w-lg mx-auto max-h-[calc(100svh-var(--alto-barra-accion,0px)-env(safe-area-inset-bottom)-3rem)] flex flex-col overflow-hidden"
	>
		<div class="flex items-start justify-between gap-2 px-6 pt-6 pb-4">
			<h2 id="{idDialogo}-titulo" tabindex="-1" class="text-xl font-semibold text-text-primary m-0">
				{titulo}
			</h2>
			<!-- Cierre del encabezado: nombre accesible distinto del "Volver"
			     del pie; el icono es decorativo (aria-hidden). -->
			<button
				type="button"
				aria-label={M.modal.cerrar}
				onclick={alCerrar}
				class="min-h-12 min-w-12 flex items-center justify-center rounded-lg bg-surface-alt border border-border-strong text-text-primary transition-colors active:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 touch-manipulation"
			>
				<Equis tamano="1.25em" />
			</button>
		</div>
		<div class="overflow-y-auto px-6" bind:this={zonaContenido} onscroll={actualizarSombra}>
			{@render children()}
		</div>
		<div class="px-6 pt-4 pb-6 bg-surface-alt {hayMasAbajo ? 'sombra-pie-modal' : ''}">
			{#if acciones}
				<div class="flex flex-col gap-2">
					{@render acciones()}
				</div>
			{:else}
				<Boton variante="secundario" onclick={alCerrar}>{M.modal.volver}</Boton>
			{/if}
		</div>
	</div>
{/if}

<style>
	.sombra-pie-modal {
		box-shadow: 0 -0.5rem 1rem -0.5rem rgb(0 0 0 / 0.3);
	}
</style>