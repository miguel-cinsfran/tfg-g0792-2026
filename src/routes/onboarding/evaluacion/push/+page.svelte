<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite, anunciarAssertive } from '$lib/a11y/live-region';
	import { M } from '$lib/mensajes/ui';
	import { obtener, actualizar, pasoPendiente, puedeVisitar, pasoAnterior, gruposOmitidosPorDolor } from '$lib/onboarding/estado';
	import { entero, validarConteo } from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import { DESCRIPCION_FLEXIONES } from '$lib/onboarding/descripciones-evaluacion';

	const RUTA = '/onboarding/evaluacion/push';
	const CAMPO = 'reps_push' as const;

	// Pruebas que quedan en el orden efectivo: sin anclaje no hay
	// traccion, y el dolor declarado puede saltear mas grupos.
	const omitidos = new Set(gruposOmitidosPorDolor());
	const tieneAnclaje = obtener().tiene_anclaje;
	const pruebasRestantes =
		(omitidos.has('PUSH') ? 0 : 1) +
		(tieneAnclaje !== false && !omitidos.has('PULL') ? 1 : 0) +
		(omitidos.has('LEGS') ? 0 : 1) +
		(omitidos.has('CORE') ? 0 : 1);

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

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Limpia el error en cuanto el valor pasa a ser valido.
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
		goto(pasoAnterior('/onboarding/evaluacion/push') ?? resolve('/onboarding/disponibilidad'));
	}
</script>

<svelte:head><title>{M.onboarding.evaluacion.push.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.evaluacion.push.titulo}</h1>
</Cabecera>

<p class="mt-2 text-text-secondary">
	{M.onboarding.evaluacion.push.introduccion(pruebasRestantes)}
</p>

<div class="space-y-6">
	<Card titulo={M.onboarding.evaluacion.push.comoHacer}>
		<DescripcionEjercicio descripcion={DESCRIPCION_FLEXIONES} plegarClaves />
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

	<!-- "No puedo" es una respuesta, no avance: queda con el grupo, NO en la barra. -->
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
