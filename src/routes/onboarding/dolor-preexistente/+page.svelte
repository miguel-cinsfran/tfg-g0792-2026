<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import GrupoSeleccionMultiple from '$lib/components/GrupoSeleccionMultiple.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import { ZONAS, type Zona } from '$lib/motor/schema';
	import { etiquetaZona } from '$lib/catalogo/etiquetas';

	const RUTA = '/onboarding/dolor-preexistente';

	let heading = $state<HTMLElement>();
	let zonas = $state<Zona[]>([]);
	$effect(() => {
		const e = obtener();
		if (e.zonas_dolor_preexistente !== null) {
			zonas = [...e.zonas_dolor_preexistente];
		}
	});

	$effect(() => {
		if (!puedeVisitar(RUTA)) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(pasoPendiente(), { replaceState: true });
		}
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function continuar() {
		actualizar({ zonas_dolor_preexistente: [...zonas] });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/onboarding/equipamiento');
	}
</script>

<svelte:head><title>Zonas con dolor previo</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Zonas con dolor previo</h1>

<GrupoSeleccionMultiple
	leyenda="Selecciona las zonas con dolor previo"
	nombre="zonas_dolor"
	opciones={ZONAS.map((zona) => ({ valor: zona, etiqueta: etiquetaZona(zona) }))}
	bind:valores={zonas}
	id="grupo-zonas-dolor"
/>

<p class="mt-3 text-sm text-text-secondary">
	Si no te duele nada, sigue adelante sin marcar nada.
</p>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>Continuar</Boton>
	{/snippet}
</BarraAccion>
