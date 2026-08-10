<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil } from '$lib/db/consultas';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { etiquetaObjetivo } from '$lib/catalogo/etiquetas';
	import { calcularImc, type CategoriaImc } from '$lib/salud/imc';
	import { capitalizar } from '$lib/ui/texto';
	import type { Perfil } from '$lib/motor/schema';
	import { M, formatearTiempo } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';

	const LABELS_CATEGORIA_IMC: Record<CategoriaImc, string> = {
		bajo_peso: 'bajo peso',
		normal: 'normal',
		sobrepeso: 'sobrepeso',
		obesidad: 'obesidad'
	};

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);

	$effect(() => {
		enfocarPrincipal(heading);
	});

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
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
	<h1 tabindex="-1" bind:this={heading}>{M.perfil.titulo}</h1>
	<div class="flex flex-col gap-4 mt-4">
		<Card titulo={M.perfil.resumen.tuPlan}>
			<p class="m-0">{M.perfil.resumen.nombre} {perfil.nombre || '—'}</p>
			<p class="m-0">{M.perfil.resumen.objetivo} {etiquetaObjetivo(perfil.objetivo)}</p>
			<p class="m-0 tabular-nums">{M.perfil.resumen.diasSemana(perfil.dias_semana)}</p>
			<p class="m-0 tabular-nums">{M.perfil.resumen.duracionSesion(formatearTiempo(perfil.duracion_sesion_min * 60))}</p>
			<p class="m-0">{M.perfil.resumen.nivel} {capitalizar(perfil.nivel_experiencia)}.</p>
		</Card>
		{#if perfil.altura_cm != null}
			{@const imc = calcularImc(perfil.peso_kg, perfil.altura_cm)}
			{#if imc !== null}
				<Card titulo={M.perfil.resumen.imcTitulo}>
					<p class="m-0 text-4xl font-bold font-mono tabular-nums">{M.perfil.resumen.imcValor(imc.valor)}</p>
					<p class="m-0 text-text-secondary">{M.perfil.resumen.imcCategoria} {LABELS_CATEGORIA_IMC[imc.categoria]}.</p>
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
		<div class="flex flex-col gap-2">
			<Boton variante="secundario" onclick={() => goto(resolve('/ayuda'))}>{M.perfil.resumen.botonAyuda}</Boton>
			<Boton variante="primario" onclick={() => goto(resolve('/config'))}>{M.perfil.resumen.botonConfiguracion}</Boton>
		</div>
	</div>
{/if}
