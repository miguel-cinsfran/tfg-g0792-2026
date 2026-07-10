<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import { OBJETIVOS, type Objetivo } from '$lib/motor/schema';
	import { etiquetaObjetivo, descripcionObjetivo } from '$lib/catalogo/etiquetas';

	const RUTA = '/onboarding/objetivo';

	const OPCIONES = OBJETIVOS.map((obj) => ({
		valor: obj,
		etiqueta: etiquetaObjetivo(obj),
		descripcion: descripcionObjetivo(obj)
	}));

	let heading = $state<HTMLElement>();
	let seleccionado = $state<Objetivo | null>(null);
	let errorSeleccion = $state<string | null>(null);

	$effect(() => {
		const e = obtener();
		if (e.objetivo !== null) seleccionado = e.objetivo;
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
		if (seleccionado === null) {
			errorSeleccion = 'Elige un objetivo para continuar.';
			document.getElementById('grupo-objetivo')?.querySelector('input')?.focus();
			return;
		}
		actualizar({ objetivo: seleccionado });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/onboarding/datos');
	}
</script>

<svelte:head><title>Tu objetivo</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Tu objetivo</h1>

<GrupoSeleccion
	leyenda="Selecciona tu objetivo"
	nombre="objetivo"
	opciones={OPCIONES}
	bind:valor={seleccionado}
	error={errorSeleccion}
	id="grupo-objetivo"
/>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>Continuar</Boton>
	{/snippet}
</BarraAccion>
