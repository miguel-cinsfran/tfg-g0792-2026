<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil } from '$lib/db/consultas';
	import { obtenerEstadosTodos } from '$lib/db/estado';
	import { obtenerHistorial, obtenerUltimaSesion } from '$lib/db/sesiones';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { etiquetaObjetivo, etiquetaZona } from '$lib/catalogo/etiquetas';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerVistaPrevia } from '$lib/motor/vista-previa';
	import { calcularImc } from '$lib/salud/imc';
	import { capitalizar } from '$lib/ui/texto';
	import type { Perfil, EstadoEjercicio, SesionCompletada } from '$lib/motor/schema';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import Engranaje from '$lib/components/iconos/Engranaje.svelte';

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	// null = sin cargar o lectura fallida (sin frases, sin ruido).
	let estados = $state<EstadoEjercicio[] | null>(null);
	let historial = $state<SesionCompletada[] | null>(null);
	let ultimaSesion = $state<SesionCompletada | null | undefined>(undefined);

	$effect(() => {
		enfocarPrincipal(heading);
	});

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosTodos()).subscribe({
			next: (v) => { estados = v; },
			error: () => { estados = []; },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerHistorial()).subscribe({
			next: (v) => { historial = v; },
			error: () => { historial = []; },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerUltimaSesion()).subscribe({
			next: (v) => { historial = historial; ultimaSesion = v ?? null; },
			error: () => { ultimaSesion = null; },
		});
		return () => sub.unsubscribe();
	});

	// Mismas frases de fuera del plan que el resumen del alta, con la
	// vista previa actual: solo si aplican.
	let frasesFuera = $derived.by(() => {
		if (perfil === null || perfil === undefined) return [];
		if (estados === null || historial === null || ultimaSesion === undefined) return [];
		const vista = obtenerVistaPrevia(
			perfil,
			estados,
			historial,
			ultimaSesion,
			[...obtenerCatalogo()],
			Date.now(),
		);
		const frases: string[] = [];
		const fuera = vista.patrones_fuera_del_plan;
		if (!perfil.tiene_anclaje && fuera.some((p) => p === 'PULL_H' || p === 'PULL_V')) {
			frases.push(M.onboarding.resumen.fraseFueraPorAnclaje);
		}
		const restoFuera = perfil.tiene_anclaje
			? fuera
			: fuera.filter((p) => p !== 'PULL_H' && p !== 'PULL_V');
		if (perfil.zonas_dolor_preexistente.length > 0 && restoFuera.length > 0) {
			frases.push(
				M.onboarding.resumen.fraseFueraPorDolor(
					perfil.zonas_dolor_preexistente.map((z) => etiquetaZona(z).toLowerCase()).join(', '),
				),
			);
		}
		return frases;
	});
</script>

<svelte:head><title>{M.perfil.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<h1 tabindex="-1" bind:this={heading}>{M.perfil.titulo}</h1>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<h1 tabindex="-1" bind:this={heading}>{M.perfil.titulo}</h1>
	<p>{M.perfil.cargando}</p>
{:else if perfil === null}
	<h1 tabindex="-1" bind:this={heading}>{M.perfil.titulo}</h1>
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>{M.perfil.sinPerfil}</Boton>
 {:else}
	<header class="flex items-center justify-between gap-3 mb-4">
		<h1 tabindex="-1" bind:this={heading}>{M.perfil.titulo}</h1>
		<button
			type="button"
			onclick={() => goto(resolve('/config'))}
			aria-label={M.perfil.resumen.botonConfiguracion}
			class="shrink-0 min-h-12 min-w-12 flex items-center justify-center rounded p-2 text-text-primary hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento"
		>
			<Engranaje />
		</button>
	</header>
	<div class="flex flex-col gap-4">
		<Card titulo={M.perfil.resumen.tuPlan}>
			<p class="m-0">{M.perfil.resumen.nombre} {perfil.nombre || '—'}</p>
			<p class="m-0">{M.perfil.resumen.objetivo} {etiquetaObjetivo(perfil.objetivo)}</p>
			<p class="m-0 tabular-nums">{M.perfil.resumen.diasSemana(perfil.dias_semana)}</p>
			<p class="m-0 tabular-nums">{M.perfil.resumen.duracion(perfil.duracion_sesion_min)}</p>
			<p class="m-0">{M.perfil.resumen.nivel} {capitalizar(perfil.nivel_experiencia)}</p>
			<p class="m-0">{M.perfil.resumen.equipo(perfil.tiene_anclaje)}</p>
			<p class="m-0">
				{perfil.zonas_dolor_preexistente.length > 0
					? M.perfil.resumen.zonasDolor(
							perfil.zonas_dolor_preexistente.map((z) => etiquetaZona(z).toLowerCase()).join(', ')
						)
					: M.perfil.resumen.zonasDolorNinguna}
			</p>
			{#each frasesFuera as frase (frase)}
				<p class="m-0">{frase}</p>
			{/each}
		</Card>
		{#if perfil.altura_cm != null}
			{@const imc = calcularImc(perfil.peso_kg, perfil.altura_cm)}
			{#if imc !== null}
				<Card titulo={M.perfil.resumen.imcTitulo}>
					<p class="m-0 text-4xl font-bold font-mono tabular-nums">{M.perfil.resumen.imcValor(imc.valor)}</p>
					<p class="m-0 text-text-secondary">{M.perfil.resumen.imcCategoria} {M.perfil.resumen.categoriaImc(imc.categoria)}.</p>
					<p class="m-0 text-sm text-text-secondary">{M.perfil.resumen.imcSalvedad}</p>
				</Card>
			{:else}
				<Card titulo={M.perfil.resumen.imcTitulo}>
					<p class="m-0">{M.perfil.resumen.imcNoDisponibleFaltaAltura}</p>
				</Card>
			{/if}
		{:else}
			<Card titulo={M.perfil.resumen.imcTitulo}>
				<p class="m-0">{M.perfil.resumen.imcNoDisponibleSinAltura}</p>
			</Card>
		{/if}
	</div>
{/if}
