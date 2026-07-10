<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { obtenerHistorial } from '$lib/db/sesiones';
	import { obtenerHistorialDolor } from '$lib/db/dolor';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { mensajePara } from '$lib/errores/mensajes';
	import { calcularRacha, calcularMejorRacha } from '$lib/motor/racha';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { etiquetaTipoSesion, etiquetaZona } from '$lib/catalogo/etiquetas';
	import Card from '$lib/components/Card.svelte';
	import Boton from '$lib/components/Boton.svelte';
	import Llama from '$lib/components/iconos/Llama.svelte';
	import Calendario from '$lib/components/iconos/Calendario.svelte';
	import CirculoCheque from '$lib/components/iconos/CirculoCheque.svelte';
	import Medalla from '$lib/components/iconos/Medalla.svelte';

	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { dateStyle: 'long' });

	let heading = $state<HTMLElement>();
	let errorLectura = $state<string | null>(null);

	// Lecturas reactivas de Dexie (ADR-0006), mismo patron del dashboard.
	// obtenerHistorial y obtenerHistorialDolor ya devuelven mas reciente
	// primero (orderBy fecha reverse en la capa db).
	let perfil = $state<Awaited<ReturnType<typeof obtenerPerfil>> | null | undefined>(undefined);
	let historial = $state<Awaited<ReturnType<typeof obtenerHistorial>> | undefined>(undefined);
	let eventosDolor = $state<Awaited<ReturnType<typeof obtenerHistorialDolor>> | undefined>(undefined);

	$effect(() => {
		const sub = liveQuery(() => obtenerPerfil()).subscribe({
			next: (v) => { perfil = v ?? null; },
			error: (e) => { errorLectura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerHistorial()).subscribe({
			next: (v) => { historial = v; },
			error: (e) => { errorLectura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerHistorialDolor()).subscribe({
			next: (v) => { eventosDolor = v; },
			error: (e) => { errorLectura = mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	let totalCompletadas = $derived(
		historial ? historial.filter((s) => !s.cancelada_por_dolor).length : 0,
	);
	let racha = $derived(
		perfil && historial ? calcularRacha(historial, perfil.dias_semana, Date.now()) : 0,
	);
	let mejorRacha = $derived(
		perfil && historial ? calcularMejorRacha(historial, perfil.dias_semana, Date.now()) : 0,
	);

	function nombreDe(ejercicio_id: string): string {
		return obtenerEjercicio(ejercicio_id)?.nombre ?? ejercicio_id;
	}
</script>

<svelte:head><title>Tu progreso</title></svelte:head>
<h1 tabindex="-1" bind:this={heading}>Tu progreso</h1>

{#if errorLectura !== null}
	<p>{errorLectura}</p>
{:else if perfil === undefined || historial === undefined || eventosDolor === undefined}
	<p>Cargando...</p>
{:else}
	<div class="space-y-4">
		{#if racha > 0}
			<Card>
				<div class="flex items-center gap-2 tabular-nums">
					<Llama clase="text-naranja" />
				<p class="m-0">
					<span aria-hidden="true" class="text-5xl font-mono font-bold tabular-nums text-naranja">{racha}</span>
					Llevas {racha} semanas seguidas entrenando
				</p>
			</div>
		</Card>
		{:else if totalCompletadas > 0}
			<p class="tabular-nums">Todavía no armaste racha; arranca esta semana</p>
		{/if}

		<Card titulo="Sesiones">
			<div class="flex items-center gap-2 tabular-nums">
				<CirculoCheque />
				<p class="m-0">Completaste <span class="tabular-nums">{totalCompletadas}</span> sesiones</p>
			</div>
		</Card>

		{#if mejorRacha > 0}
			<Card titulo="Mejor racha">
				<div class="flex items-center gap-2 tabular-nums">
					<Medalla clase="text-naranja" />
					<p class="m-0">Tu mejor racha: <span class="text-naranja tabular-nums">{mejorRacha}</span> semanas</p>
				</div>
			</Card>
		{/if}

		<h2>Historial de sesiones</h2>
		{#if historial.length === 0}
			<Card>
				<p>Todavía no tienes sesiones. Arranca con la primera y arma la racha.</p>
				<Boton variante="primario" tamano="grande" onclick={() => goto(resolve('/sesion'))}>Iniciar primera sesión</Boton>
			</Card>
		{:else}
			<section class="border border-border bg-surface-alt rounded-lg p-4">
				<div class="space-y-2">
					{#each historial as sesion (sesion.id)}
						<details class="desplegable">
							<summary>
								<Calendario />
								{FORMATO_FECHA.format(sesion.fecha)}, {etiquetaTipoSesion(sesion.tipo)}, <span class="tabular-nums">{sesion.duracion_minutos}</span> minutos{sesion.cancelada_por_dolor ? ', cancelada por dolor' : ''}
							</summary>
							<ul>
								{#each sesion.ejercicios as ejecutado (ejecutado.ejercicio_id)}
									<li>{nombreDe(ejecutado.ejercicio_id)}: {ejecutado.series_completadas} de {ejecutado.series_planificadas} series, reps {ejecutado.reps_reales.join(', ')}</li>
								{/each}
							</ul>
						</details>
					{/each}
				</div>
			</section>
		{/if}

		<h2>Eventos de dolor</h2>
		{#if eventosDolor.length === 0}
			<p>No hay eventos de dolor registrados.</p>
		{:else}
			<section class="border border-border bg-surface-alt rounded-lg p-4">
				<div class="space-y-2">
					{#each eventosDolor as evento (evento.id)}
						<details class="desplegable">
							<summary>{FORMATO_FECHA.format(evento.fecha)}: {nombreDe(evento.ejercicio_id)}</summary>
							<p>Zonas: {evento.zonas.length > 0 ? evento.zonas.map((z) => etiquetaZona(z)).join(', ') : 'sin detalle'}</p>
							<p>Estado: {evento.estado === 'bloqueado' ? 'Bloqueado' : 'Resuelto'}</p>
						</details>
					{/each}
				</div>
			</section>
		{/if}
	</div>
{/if}
