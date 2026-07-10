<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import { entero, validarConteo } from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import { DESCRIPCION_SENTADILLAS } from '$lib/onboarding/descripciones-evaluacion';

	const RUTA = '/onboarding/evaluacion/legs';
	const CAMPO = 'reps_legs' as const;

	let heading = $state<HTMLElement>();
	let input = $state<HTMLInputElement>();
	// Texto + inputmode=numeric (no type=number): con TalkBack el valor
	// tecleado se perdia y se anunciaba como spinner.
	let valor = $state('');
	let error = $state<string | null>(null);

	const MENSAJE_INVALIDO =
		"Escribe cuántas repeticiones hiciste, o usa «No puedo hacer ninguna».";

	$effect(() => {
		const e = obtener();
		if (e[CAMPO] !== null) valor = String(e[CAMPO]);
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

	$effect(() => {
		if (error !== null && validarConteo(valor)) error = null;
	});

	function continuar() {
		if (!validarConteo(valor)) {
			error = MENSAJE_INVALIDO;
			anunciarPolite(MENSAJE_INVALIDO);
			input?.focus();
			return;
		}
		actualizar({ [CAMPO]: entero(valor) as number });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	function noPuedo() {
		actualizar({ [CAMPO]: 0 });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	// Atras: si no tiene anclaje, viene de push; si tiene anclaje, de pull
	function atras() {
		const rutaAtras = obtener().tiene_anclaje === false
			? '/onboarding/evaluacion/push'
			: '/onboarding/evaluacion/pull';
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(rutaAtras);
	}
</script>

<svelte:head><title>Evaluación: sentadillas</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Evaluación: sentadillas</h1>

<div class="space-y-6">
	<Card titulo="Cómo hacer sentadillas">
		<DescripcionEjercicio descripcion={DESCRIPCION_SENTADILLAS} />
	</Card>

	<Card titulo="Tu conteo">
		<label for="reps-input" class="block text-text-primary">
			¿Cuántas repeticiones puedes hacer?
		</label>
		<input
			id="reps-input"
			bind:this={input}
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			autocomplete="off"
			bind:value={valor}
			aria-invalid={error !== null ? 'true' : undefined}
			aria-describedby={error !== null ? 'error-reps' : undefined}
			class="mt-2 text-2xl font-bold tabular-nums font-mono"
		/>
		<p class="mt-1 text-sm text-text-secondary">Entero entre 0 y 300.</p>
		{#if error}
			<p id="error-reps" class="mt-1 text-sm text-error">{error}</p>
		{/if}
	</Card>

	<div class="mt-4">
		<Boton variante="secundario" onclick={noPuedo}>No puedo hacer ninguna</Boton>
	</div>
</div>
<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>
			Continuar
		</Boton>
	{/snippet}
</BarraAccion>
