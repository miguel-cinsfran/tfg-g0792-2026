<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';

	const RUTA = '/onboarding/disponibilidad';

	const DIAS = [2, 3, 4, 5] as const;
	const DURACIONES = [20, 30, 45] as const;

	const OPCIONES_DIAS = DIAS.map((d) => ({
		valor: d.toString(),
		etiqueta: `${d} días`
	}));
	const OPCIONES_DURACION = DURACIONES.map((d) => ({
		valor: d.toString(),
		etiqueta: `${d} minutos`
	}));

	let heading = $state<HTMLElement>();
	let valorDias = $state<string | null>(null);
	let valorDuracion = $state<string | null>(null);
	let errorDias = $state<string | null>(null);
	let errorDuracion = $state<string | null>(null);

	$effect(() => {
		const e = obtener();
		if (e.dias_semana !== null) valorDias = e.dias_semana.toString();
		if (e.duracion_sesion_min !== null) valorDuracion = e.duracion_sesion_min.toString();
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
		const diasNumero = valorDias === null ? null : Number(valorDias);
		const duracionNumero = valorDuracion === null ? null : Number(valorDuracion);
		let focoPrimerError: string | null = null;
		if (diasNumero === null) {
			errorDias = 'Elige cuántos días por semana.';
			focoPrimerError = 'grupo-dias';
		}
		if (duracionNumero === null) {
			errorDuracion = 'Elige cuánto dura la sesión.';
			focoPrimerError = focoPrimerError ?? 'grupo-duracion';
		}
		if (focoPrimerError !== null) {
			document.getElementById(focoPrimerError)?.querySelector('input')?.focus();
			return;
		}
		actualizar({
			dias_semana: diasNumero as number,
			duracion_sesion_min: duracionNumero as number
		});
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/onboarding/dolor-preexistente');
	}
</script>

<svelte:head><title>Tu disponibilidad</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Tu disponibilidad</h1>

<div class="space-y-6">
	<GrupoSeleccion
		leyenda="Días por semana"
		nombre="dias"
		opciones={OPCIONES_DIAS}
		bind:valor={valorDias}
		error={errorDias}
		id="grupo-dias"
	/>

	<GrupoSeleccion
		leyenda="Duración de la sesión"
		nombre="duracion"
		opciones={OPCIONES_DURACION}
		bind:valor={valorDuracion}
		error={errorDuracion}
		id="grupo-duracion"
	/>
</div>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>Continuar</Boton>
	{/snippet}
</BarraAccion>
