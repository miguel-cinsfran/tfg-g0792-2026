<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { obtener, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import { finalizar } from '$lib/onboarding/finalizar';
	import { evaluarNivelInicial } from '$lib/motor/evaluacion';
	import type { ResultadoEvaluacion } from '$lib/motor/evaluacion';
	import { mensajePara } from '$lib/errores/mensajes';
	import type { Nivel } from '$lib/motor/schema';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';

	const RUTA = '/onboarding/resumen';

	let heading = $state<HTMLElement>();
	let resultado = $state<ResultadoEvaluacion | null>(null);
	let finalizando = $state(false);
	let errorMsg = $state<string | null>(null);

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
		const e = obtener();
		resultado = evaluarNivelInicial(
			{
				reps_push: e.reps_push!,
				reps_pull: e.reps_pull ?? 0,
				reps_legs: e.reps_legs!,
				segundos_core: e.segundos_core!,
				tiene_anclaje: e.tiene_anclaje!,
			},
			Date.now(),
		);
	});

	const NIVEL_TEXTO: Record<Nivel, string> = {
		principiante: 'Principiante',
		intermedio: 'Intermedio',
		avanzado: 'Avanzado',
	};

	const PATRON_TEXTO: Record<string, string> = {
		PUSH: 'empuje (flexiones)',
		PULL: 'tracción (remo)',
		LEGS: 'piernas (sentadillas)',
		CORE: 'core (plancha)',
	};

	async function empezar() {
		finalizando = true;
		errorMsg = null;
		try {
			await finalizar(obtener(), Date.now());
			goto(resolve('/'));
		} catch {
			const msg = mensajePara('ERR-DB-WRITE');
			anunciarAssertive(msg);
			errorMsg = msg;
			finalizando = false;
		}
	}
</script>

<svelte:head><title>Tu resumen</title></svelte:head>

<h1 tabindex="-1" bind:this={heading}>Tu resumen</h1>

{#if resultado}
	<div class="space-y-6">
		<Card titulo="Tu nivel">
			<p class="mt-1 text-4xl font-bold text-acento">
				{NIVEL_TEXTO[resultado.nivel_global]}
			</p>
		</Card>

		{#if resultado.ajuste_desbalance_activo !== null}
			<Card titulo="Patrón a reforzar">
				<p>
					Tu punto más flojo es {PATRON_TEXTO[resultado.ajuste_desbalance_activo.patron]}.
					Vamos a darle prioridad en tus entrenamientos.
				</p>
			</Card>
		{/if}

		{#if errorMsg}
			<p class="text-error" role="alert">{errorMsg}</p>
		{/if}
	</div>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={empezar} deshabilitado={finalizando} avance>
				Empezar mi primer entrenamiento
			</Boton>
		{/snippet}
		{#snippet secundaria()}
			<Boton variante="secundario" onclick={() => goto(resolve('/ayuda'))}>
				Ayuda
			</Boton>
		{/snippet}
	</BarraAccion>
{/if}
