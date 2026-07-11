<script lang="ts">
	import { goto } from '$app/navigation';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import { entero, validarConteo } from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import Card from '$lib/components/Card.svelte';
	import Cronometro from '$lib/components/Cronometro.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import { DESCRIPCION_PLANCHA } from '$lib/onboarding/descripciones-evaluacion';

	const RUTA = '/onboarding/evaluacion/core';
	const CAMPO = 'segundos_core' as const;

	let heading = $state<HTMLElement>();
	let input = $state<HTMLInputElement>();
	// Texto + inputmode=numeric (no type=number): con TalkBack el valor
	// tecleado se perdia y el campo se anunciaba como spinner.
	let valor = $state('');
	let error = $state<string | null>(null);
	// El campo manual vive en un <details> colapsado. Si la validacion
	// falla, lo abrimos antes de enfocar para que el control no quede
	// visualmente cerrado.
	let anotarAbierto = $state(false);

	const MENSAJE_INVALIDO =
		"Escribe cuántos segundos aguantaste, o usa «No puedo sostenerla».";

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
			// Abrir el desplegable antes de enfocar.
			anotarAbierto = true;
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

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/onboarding/evaluacion/legs');
	}
</script>

<svelte:head><title>Evaluación: plancha</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Evaluación: plancha</h1>

<div class="space-y-6">
	<Card titulo="Cómo hacer la plancha">
		<DescripcionEjercicio descripcion={DESCRIPCION_PLANCHA} plegarClaves />
	</Card>

	<Card titulo="Medición">
		<p>
			Toca "Empezar a contar", ponte en posición y sostén la plancha. Cuando
			no aguantes más, toca "Parar": los segundos quedan registrados solos. Si
			prefieres, también puedes anotarlos a mano desplegando «Anotar a mano».
		</p>
		<div class="mt-3">
			<Cronometro
				alParar={(s) => {
					valor = String(s);
				}}
				reloj
				cadenciaRelojMs={500}
			/>
		</div>
	</Card>

	<details class="clase-tema-anotar desplegable" bind:open={anotarAbierto}>
		<summary>Anotar a mano</summary>
		<label for="segundos-input" class="block text-text-primary">
			¿Cuántos segundos aguantaste la plancha?
		</label>
		<input
			id="segundos-input"
			bind:this={input}
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			autocomplete="off"
			bind:value={valor}
			aria-invalid={error !== null ? 'true' : undefined}
			aria-describedby={error !== null ? 'error-segundos' : undefined}
			class="mt-2 text-2xl font-bold tabular-nums font-mono"
		/>
		<p class="mt-1 text-sm text-text-secondary">Entero entre 0 y 300.</p>
		{#if error}
			<p id="error-segundos" class="mt-1 text-sm text-error">{error}</p>
		{/if}
	</details>

	<div class="mt-4">
		<Boton variante="secundario" onclick={noPuedo}>No puedo sostenerla</Boton>
	</div>
</div>
<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={continuar} avance>
			Continuar
		</Boton>
	{/snippet}
</BarraAccion>

<style>
	/* Mismo patron que la Ayuda: <details>/<summary> nativo, el lector
	   anuncia "expandible/contraible" sin ARIA custom. */
	.clase-tema-anotar {
		background-color: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0;
	}
	.clase-tema-anotar[open] {
		border-color: var(--color-border-strong);
	}
	.clase-tema-anotar > summary {
		min-height: 3rem;
		padding: 0.75rem 2.25rem 0.75rem 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		touch-action: manipulation;
		user-select: none;
	}
	.clase-tema-anotar > summary:focus {
		outline: none;
	}
	.clase-tema-anotar > summary:focus-visible {
		outline: 2px solid var(--color-acento);
		outline-offset: 2px;
		border-radius: 0.5rem;
	}
	.clase-tema-anotar > :not(summary) {
		padding-inline: 1rem;
	}
	.clase-tema-anotar > :not(summary):first-child {
		padding-top: 0.25rem;
	}
	.clase-tema-anotar > :not(summary):last-child {
		padding-bottom: 0.75rem;
	}
</style>
