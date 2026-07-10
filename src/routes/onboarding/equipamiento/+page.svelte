<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
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
			errorSeleccion = 'Elige una opción para continuar.';
			document.getElementById('grupo-equipamiento')?.querySelector('input')?.focus();
			return;
		}
		actualizar({ tiene_anclaje: tieneAnclaje });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/onboarding/objetivo');
	}
</script>

<svelte:head><title>Equipamiento disponible</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Equipamiento disponible</h1>

<GrupoSeleccion
	leyenda="¿Tienes una barra o un anclaje para suspensión?"
	nombre="tiene_anclaje"
	opciones={OPCIONES}
	bind:valor={seleccion}
	error={errorSeleccion}
	id="grupo-equipamiento"
/>

<p class="mt-2 text-sm text-text-secondary">
	Sirve una barra de dominadas de marco de puerta, unas anillas o una correa de
	suspensión colgada de un anclaje firme.
</p>

{#if seleccion === 'no'}
	<p class="mt-3 text-sm text-text-secondary">
		Sin un anclaje no se evalúa la tracción: ese patrón arranca en nivel principiante.
	</p>
{/if}

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>Continuar</Boton>
	{/snippet}
</BarraAccion>
