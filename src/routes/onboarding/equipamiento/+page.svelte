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

	const RUTA = '/onboarding/equipamiento';

	const OPCIONES: Array<{ valor: 'si' | 'no'; etiqueta: string; descripcion?: string }> = [
		{ valor: 'si', etiqueta: 'Sí' },
		{ valor: 'no', etiqueta: 'No' }
	];

	let heading = $state<HTMLElement>();
	let seleccion = $state<'si' | 'no' | null>(null);
	let errorSeleccion = $state<string | null>(null);

	$effect(() => {
		const e = obtener();
		if (e.tiene_anclaje === true) seleccion = 'si';
		else if (e.tiene_anclaje === false) seleccion = 'no';
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

	const tieneAnclaje = $derived(seleccion === 'si' ? true : seleccion === 'no' ? false : null);

	function continuar() {
		if (tieneAnclaje === null) {
			errorSeleccion = M.onboarding.equipamiento.errorSeleccion;
			anunciarAssertive(errorSeleccion);
			document.getElementById('grupo-equipamiento')?.querySelector('input')?.focus();
			return;
		}
		actualizar({ tiene_anclaje: tieneAnclaje });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoAnterior('/onboarding/equipamiento') ?? '/onboarding/objetivo');
	}
</script>

<svelte:head><title>{M.onboarding.equipamiento.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.equipamiento.titulo}</h1>
</Cabecera>

<p id="explicacion-equipamiento" class="mt-2 text-sm text-text-secondary">
	{M.onboarding.equipamiento.explicacion}
</p>

<GrupoSeleccion
	leyenda={M.onboarding.equipamiento.leyenda}
	nombre="tiene_anclaje"
	opciones={OPCIONES}
	bind:valor={seleccion}
	error={errorSeleccion}
	id="grupo-equipamiento"
	descripcionId="explicacion-equipamiento"
/>

{#if seleccion === 'no'}
	<p class="mt-3 text-sm text-text-secondary">
		{M.onboarding.equipamiento.sinAnclaje}
	</p>
{/if}

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>{M.onboarding.comun.continuar}</Boton>
	{/snippet}
</BarraAccion>
