<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { M } from '$lib/mensajes/ui';
	import { obtener, actualizar, pasoPendiente, puedeVisitar, pasoAnterior } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
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
		goto(pasoAnterior('/onboarding/dolor-preexistente') ?? '/onboarding/equipamiento');
	}
</script>

<svelte:head><title>{M.onboarding.dolor.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.dolor.titulo}</h1>
</Cabecera>

<p id="explicacion-dolor" class="mt-3 text-sm text-text-secondary">
	{M.onboarding.dolor.sinDolor}
</p>

<GrupoSeleccionMultiple
	leyenda={M.onboarding.dolor.leyenda}
	nombre="zonas_dolor"
	opciones={ZONAS.map((zona) => ({ valor: zona, etiqueta: etiquetaZona(zona) }))}
	bind:valores={zonas}
	id="grupo-zonas-dolor"
	descripcionId="explicacion-dolor"
/>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>{M.onboarding.comun.continuar}</Boton>
	{/snippet}
</BarraAccion>
