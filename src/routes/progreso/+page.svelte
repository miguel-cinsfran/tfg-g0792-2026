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
	import { M } from '$lib/mensajes/ui';
	import { etiquetaTipoSesion, etiquetaZona } from '$lib/catalogo/etiquetas';
	import Card from '$lib/components/Card.svelte';
	import Boton from '$lib/components/Boton.svelte';
	import Llama from '$lib/components/iconos/Llama.svelte';
	import Calendario from '$lib/components/iconos/Calendario.svelte';
	import CirculoCheque from '$lib/components/iconos/CirculoCheque.svelte';
	import Medalla from '$lib/components/iconos/Medalla.svelte';

	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
	// Valor de datos del evento de dolor; la etiqueta visible vive en M.
	const ESTADO_EVENTO_BLOQUEADO = 'bloqueado';

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
		return obtenerEjercicio(ejercicio_id)?.nombre ?? M.progreso.ejercicioNoDisponible;
	}
</script>

<svelte:head><title>{M.progreso.titulo}</title></svelte:head>
<h1 tabindex="-1" bind:this={heading}>{M.progreso.titulo}</h1>

{#if errorLectura !== null}
	<p>{errorLectura}</p>
{:else if perfil === undefined || historial === undefined || eventosDolor === undefined}
	<p>{M.progreso.cargando}</p>
{:else}
	<div class="space-y-4">
		{#if racha > 0}
			<Card>
				<div class="flex items-center gap-2 tabular-nums">
					<Llama clase="text-naranja" />
				<p class="m-0">
					<span aria-hidden="true" class="text-5xl font-mono font-bold tabular-nums text-naranja">{racha}</span>
					{M.progreso.llevasRacha(racha)}
				</p>
			</div>
		</Card>
		{:else if totalCompletadas > 0}
			<p class="tabular-nums">{M.progreso.sinRacha}</p>
		{/if}

		<Card titulo={M.progreso.sesionesTitulo}>
			<div class="flex items-center gap-2 tabular-nums">
				<CirculoCheque />
				<p class="m-0">{M.progreso.completaste(totalCompletadas)}</p>
			</div>
		</Card>

		{#if mejorRacha > 0}
			<Card titulo={M.progreso.mejorRachaTitulo}>
				<div class="flex items-center gap-2 tabular-nums">
					<Medalla clase="text-naranja" />
					<p class="m-0">{M.progreso.mejorRacha(mejorRacha)}</p>
				</div>
			</Card>
		{/if}

		<section aria-labelledby="progreso-historial-titulo">
			<h2 id="progreso-historial-titulo">{M.progreso.historialTitulo}</h2>
			{#if historial.length === 0}
				<Card>
					<p>{M.progreso.sinSesiones}</p>
					<Boton variante="primario" tamano="grande" onclick={() => goto(resolve('/sesion'))}>{M.progreso.botonIniciarPrimeraSesion}</Boton>
				</Card>
			{:else}
				<section class="bg-surface-alt border-2 border-borde-bloque rounded-lg p-4">
					<div class="space-y-2">
						{#each historial as sesion (sesion.id)}
							<details class="desplegable">
								<summary class="tabular-nums flex items-start gap-2">
									<Calendario clase="shrink-0" />
									<span class="min-w-0">{M.progreso.resumenSesionHistorial(FORMATO_FECHA.format(sesion.fecha), etiquetaTipoSesion(sesion.tipo), sesion.duracion_minutos, sesion.cancelada_por_dolor)}</span>
								</summary>
								<ul>
									{#each sesion.ejercicios as ejecutado (ejecutado.ejercicio_id)}
										<li>{M.progreso.lineaHistorial(nombreDe(ejecutado.ejercicio_id), ejecutado.series_completadas, ejecutado.series_planificadas, ejecutado.reps_reales.join(', '))}</li>
									{/each}
								</ul>
							</details>
						{/each}
					</div>
				</section>
			{/if}
		</section>

		<section aria-labelledby="progreso-eventos-dolor-titulo">
			<h2 id="progreso-eventos-dolor-titulo">{M.progreso.eventosDolorTitulo}</h2>
			{#if eventosDolor.length === 0}
				<p>{M.progreso.sinEventosDolor}</p>
			{:else}
				<section class="bg-surface-alt border-2 border-borde-bloque rounded-lg p-4">
					<div class="space-y-2">
						{#each eventosDolor as evento (evento.id)}
						<details class="desplegable">
							<summary>{FORMATO_FECHA.format(evento.fecha)}: {nombreDe(evento.ejercicio_id)}</summary>
							<p>{M.progreso.eventoZonas(evento.zonas.length > 0 ? evento.zonas.map((z) => etiquetaZona(z)).join(', ') : M.progreso.sinDetalle)}</p>
							<p>{M.progreso.eventoEstado(evento.estado === ESTADO_EVENTO_BLOQUEADO ? M.progreso.estadoBloqueado : M.progreso.estadoResuelto)}</p>
						</details>
						{/each}
					</div>
				</section>
			{/if}
		</section>
	</div>
{/if}
