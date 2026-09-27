<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite, anunciarAssertive } from '$lib/a11y/live-region';
	import { M } from '$lib/mensajes/ui';
	import { obtener, actualizar, pasoPendiente, puedeVisitar, pasoAnterior } from '$lib/onboarding/estado';
	import { entero, validarConteo } from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import { DESCRIPCION_REMO_SUSPENSION } from '$lib/onboarding/descripciones-evaluacion';

	const RUTA = '/onboarding/evaluacion/pull';
	const CAMPO = 'reps_pull' as const;

	let heading = $state<HTMLElement>();
	let input = $state<HTMLInputElement>();
	// Texto + inputmode=numeric (no type=number): con TalkBack el valor
	// tecleado se perdia y se anunciaba como spinner.
	let valor = $state('');
	let error = $state<string | null>(null);

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

	// Si no tiene anclaje, saltar a piernas.
	$effect(() => {
		if (puedeVisitar(RUTA) && obtener().tiene_anclaje === false) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto('/onboarding/evaluacion/legs');
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
			error = M.onboarding.evaluacion.comun.mensajeInvalidoRepeticiones;
			anunciarAssertive(M.onboarding.evaluacion.comun.mensajeInvalidoRepeticiones);
			input?.focus();
			return;
		}
		actualizar({ [CAMPO]: entero(valor) as number });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoPendiente());
	}

	// "No puedo" es una respuesta mas: anota 0 y manda al Continuar
	// sin navegar, como las demas respuestas. Un toque accidental se
	// corrige escribiendo otro numero antes de continuar.
	function noPuedo() {
		actualizar({ [CAMPO]: 0 });
		valor = '0';
		anunciarPolite(M.onboarding.evaluacion.comun.anotadoNinguna);
		document.getElementById('continuar')?.focus();
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoAnterior('/onboarding/evaluacion/pull') ?? '/onboarding/evaluacion/push');
	}
</script>

<svelte:head><title>{M.onboarding.evaluacion.pull.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.evaluacion.pull.titulo}</h1>
</Cabecera>

<div class="space-y-6">
	<Card titulo={M.onboarding.evaluacion.pull.comoHacer}>
		<DescripcionEjercicio descripcion={DESCRIPCION_REMO_SUSPENSION} plegarClaves />
	</Card>

	<Card titulo={M.onboarding.evaluacion.comun.tituloConteo}>
		<label for="reps-input" class="block text-text-primary">
			{M.onboarding.evaluacion.comun.preguntaRepeticiones}
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
		<p class="mt-1 text-sm text-text-secondary">{M.onboarding.evaluacion.comun.rangoValido}</p>
		{#if error}
			<p id="error-reps" class="mt-1 text-sm text-error">{error}</p>
		{/if}
	</Card>

	<div class="mt-4">
		<Boton variante="secundario" onclick={noPuedo}>{M.onboarding.evaluacion.comun.noPuedoNinguna}</Boton>
	</div>
</div>
<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance id="continuar">
			{M.onboarding.evaluacion.comun.continuar}
		</Boton>
	{/snippet}
</BarraAccion>
