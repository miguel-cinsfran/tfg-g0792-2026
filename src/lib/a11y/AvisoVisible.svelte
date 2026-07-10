<!--
  Espejo visual no-modal de la region aria-live. El lector YA recibe
  el mensaje por ahi; este componente es SOLO para videntes y baja
  vision. Va aria-hidden porque si no, TalkBack leeria el mensaje dos
  veces (una por la region, otra por el banner).
-->
<script lang="ts">
	import { obtenerAvisoVisible, limpiarAvisoVisible } from './avisar.svelte';
	import CirculoCheque from '$lib/components/iconos/CirculoCheque.svelte';
	import Alerta from '$lib/components/iconos/Alerta.svelte';

	// 'error' espera un poco mas para que un usuario de baja vision
	// alcance a leerlo. Cualquier aviso nuevo reinicia el contador: el
	// `id` del aviso es la clave de reactividad de este $effect.
	const DURACION_EXITO_MS = 5_000;
	const DURACION_ERROR_MS = 8_000;

	$effect(() => {
		const a = obtenerAvisoVisible();
		if (a === null) return;
		const duracion = a.tipo === 'error' ? DURACION_ERROR_MS : DURACION_EXITO_MS;
		const handle = setTimeout(() => {
			limpiarAvisoVisible();
		}, duracion);
		return () => clearTimeout(handle);
	});

	const aviso = $derived(obtenerAvisoVisible());
</script>

{#if aviso}
	<!-- role=status NO se usa: aria-hidden=true ya lo aparta del a11y tree,
	     y aria duplicaria el anuncio. -->
	<div
		aria-hidden="true"
		class="aviso-visible fixed left-1/2 -translate-x-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-20 w-[calc(100%-2rem)] max-w-lg rounded-lg border px-4 py-3 shadow-none backdrop-blur-0"
		class:aviso-visible--exito={aviso.tipo === 'exito'}
		class:aviso-visible--error={aviso.tipo === 'error'}
	>
		<div class="flex items-start gap-3">
			<div class="shrink-0 mt-0.5">
				{#if aviso.tipo === 'exito'}
					<CirculoCheque tamano={22} clase="text-success" />
				{:else}
					<Alerta tamano={22} clase="text-error" />
				{/if}
			</div>
			<p class="m-0 flex-1 text-text-primary">{aviso.mensaje}</p>
		</div>
	</div>
{/if}

<style>
	/* Mismos tokens que las tarjetas de configuracion. Borde lateral es
	   la unica senal semantica: sin fondo lleno. Sin box-shadow: la
	   elevacion se gana con el color del fondo y el borde. */
	.aviso-visible {
		background-color: var(--color-surface-alt);
		border-color: var(--color-border-strong);
	}
	.aviso-visible--exito {
		border-left-width: 4px;
		border-left-color: var(--color-success);
	}
	.aviso-visible--error {
		border-left-width: 4px;
		border-left-color: var(--color-error);
	}
</style>
