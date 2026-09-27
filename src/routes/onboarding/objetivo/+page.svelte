<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { M } from '$lib/mensajes/ui';
	import { obtener, actualizar, pasoPendiente, puedeVisitar, pasoAnterior } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
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
			errorSeleccion = M.onboarding.objetivo.errorSeleccion;
			anunciarAssertive(errorSeleccion);
			document.getElementById('grupo-objetivo')?.querySelector('input')?.focus();
			return;
		}
		actualizar({ objetivo: seleccionado });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoAnterior('/onboarding/objetivo') ?? '/onboarding/datos');
	}
</script>

<svelte:head><title>{M.onboarding.objetivo.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.objetivo.titulo}</h1>
</Cabecera>

<GrupoSeleccion
	leyenda={M.onboarding.objetivo.leyenda}
	nombre="objetivo"
	opciones={OPCIONES}
	bind:valor={seleccionado}
	error={errorSeleccion}
	id="grupo-objetivo"
/>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>{M.onboarding.comun.continuar}</Boton>
	{/snippet}
</BarraAccion>
