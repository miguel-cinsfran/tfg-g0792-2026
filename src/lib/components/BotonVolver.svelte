<!--
  Boton de retroceso estandar para flujos lineales y sub-vistas. Va
  arriba a la izquierda, icono-solo con nombre accesible. El handler
  se provee por prop y la pantalla decide adonde ir (goto explicito,
  no history.back).

  Sonido: en cada click suena `navegacion-atras`. Un solo disparo por
  accion; el handler SOLO navega, sin re-sonar.
-->
<script lang="ts">
	import { sonar } from '$lib/sonido/reproducir';
	import { M } from '$lib/mensajes/ui';
	import FlechaIzquierda from '$lib/components/iconos/FlechaIzquierda.svelte';
	import { registrarVolver, quitarVolver } from '$lib/navegacion/atras-pantalla';
	import { marcarProximaComoVolver } from '$lib/navegacion/transicion';

	let {
		onclick,
		etiqueta = M.componentes.botonVolver.atras,
	}: {
		// Handler que ejecuta la navegacion. El sonido se dispara aca
		// antes de llamarlo.
		onclick: () => void;
		// Por defecto "Atras"; la sesion lo sobreescribe a "Volver al
		// inicio" (no es "atras": eso sugeriria el ejercicio anterior).
		etiqueta?: string;
	} = $props();

	function manejar() {
		sonar('navegacion-atras');
		// El goto que sigue es un volver: la transicion desliza al reves.
		marcarProximaComoVolver();
		onclick();
	}

	// El atras del telefono ejecuta este mismo manejador: mismo destino
	// y mismo sonido que el toque. Al desmontar se quita y, si habia
	// otro debajo, ese vuelve a mandar.
	$effect(() => {
		registrarVolver(manejar);
		return () => quitarVolver(manejar);
	});
</script>

<!-- Contorno circular: sin el, el icono suelto no se leia como boton
     (QA 0.6.0). Mismo lenguaje que las filas de configuracion. -->
<button
	type="button"
	aria-label={etiqueta}
	onclick={manejar}
	class="min-h-12 min-w-12 flex items-center justify-center rounded-lg bg-surface-alt border border-border-strong text-text-primary transition-colors active:brightness-90 hover:text-acento active:text-acento hover:border-acento focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface touch-manipulation"
>
	<FlechaIzquierda />
</button>
