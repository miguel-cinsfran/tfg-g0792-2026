<!--
  Barra inferior de accion fija al pie para flujos lineales. La accion
  primaria de avance siempre en el mismo lugar, predecible para el
  lector y cercana al pulgar. Las acciones-herramienta (Como se hace,
  Reportar dolor, etc.) NO viven aca: viven en el contenido.
  Layout: posicion fija al pie, full-width exterior, contenido en
  max-w-lg. Reemplaza visualmente a la barra de pestanas en las rutas
  donde se monta.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		primaria,
		secundaria,
	}: {
		// Accion primaria del flujo: un <Boton> ya construido por la pagina.
		primaria: Snippet;
		// Accion secundaria opcional: tipicamente "Atras" en onboarding,
		// "Empezar de nuevo" en reanudar, "No" en sugerencias. Si no se
		// provee, no se reserva espacio.
		secundaria?: Snippet;
	} = $props();

	// Altura real de la barra, medida en vivo. La barra es fixed y no
	// ocupa lugar en el flujo: sin esto, con dos botones apilados o con
	// la fuente del sistema agrandada tapaba el final del contenido.
	let altoBarra = $state(0);
</script>

<!-- Espaciador en flujo con la altura de la barra: garantiza que todo
     el contenido pueda scrollearse por encima de ella. -->
<div style:height="{altoBarra}px" aria-hidden="true"></div>

<div
	bind:clientHeight={altoBarra}
	class="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]"
	role="region"
	aria-label="Acciones de la pantalla"
>
	<div class="mx-auto max-w-lg px-4 py-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
		<div class="flex-1">
			{@render primaria()}
		</div>
		{#if secundaria}
			<div class="sm:flex-shrink-0">
				{@render secundaria()}
			</div>
		{/if}
	</div>
</div>
