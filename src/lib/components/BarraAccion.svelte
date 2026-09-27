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
	import { M } from '$lib/mensajes/ui';

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
	// La altura cruda tambien se publica: el aviso visible flota por
	// encima de la barra que haya; al desmontar se quita.
	let altoBarra = $state(0);
	// true cuando queda pagina sin mostrar debajo: el borde superior
	// lleva sombra como indicio de que sigue.
	let hayMasAbajo = $state(false);

	function actualizarSombra(): void {
		const resto =
			document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
		// Tolerancia de 4 px: el redondeo de subpixeles no es "contenido".
		hayMasAbajo = resto > 4;
	}

	$effect(() => {
		if (altoBarra > 0) {
			document.documentElement.style.setProperty('--alto-barra-accion', `${altoBarra}px`);
		}
		return () => document.documentElement.style.removeProperty('--alto-barra-accion');
	});

	$effect(() => {
		actualizarSombra();
		// El scroll y el resize mueven la ventana; el observador cubre
		// los cambios de altura del contenido (listas, detalles).
		const observador = new ResizeObserver(actualizarSombra);
		observador.observe(document.documentElement);
		window.addEventListener('scroll', actualizarSombra, { passive: true });
		window.addEventListener('resize', actualizarSombra);
		return () => {
			observador.disconnect();
			window.removeEventListener('scroll', actualizarSombra);
			window.removeEventListener('resize', actualizarSombra);
		};
	});
</script>

<!-- Espaciador en flujo con la altura de la barra: garantiza que todo
     el contenido pueda scrollearse por encima de ella. Existe solo
     porque la barra es fixed: si la barra vuelve al flujo, se oculta.
     El umbral cubre el teclado abierto en vertical (la ventana se
     achica y la barra estatica queda debajo del campo). -->
<div style:height="{altoBarra}px" aria-hidden="true" class="[@media(max-height:640px)]:hidden"></div>

<div
	bind:clientHeight={altoBarra}
	class="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)] [@media(max-height:640px)]:static {hayMasAbajo ? 'sombra-barra' : ''}"
	role="region"
	aria-label={M.componentes.barraAccion.accionesPantalla}
>
	<div class="mx-auto max-w-lg px-4 py-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
	<div class="flex-1">
		{@render primaria()}
	</div>
	{#if secundaria}
		<!-- Sin flex-shrink-0 la secundaria puede comprimirse: la primaria
		     flex-1 crece con el espacio sobrante y nunca queda mas angosta.
		     flex-col para que en columna el secundario llene el ancho como
		     la primaria (sus hijos se estiran); en fila el ancho lo sigue
		     dando el contenido. -->
		<div class="flex flex-col">
			{@render secundaria()}
		</div>
	{/if}
	</div>
</div>

<style>
	.sombra-barra {
		box-shadow: 0 -0.5rem 1rem -0.5rem rgb(0 0 0 / 0.3);
	}
</style>
