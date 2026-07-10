<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { obtenerEstadosTodos, marcarResuelto, reprogramarRevision } from '$lib/db/estado';
	import { obtenerHistorial, obtenerUltimaSesion } from '$lib/db/sesiones';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { sonar } from '$lib/sonido/reproducir';
	import { anunciarError } from '$lib/errores/anunciar';
	import { obtenerVistaPrevia } from '$lib/motor/vista-previa';
	import { bloqueosVencidos } from '$lib/motor/dolor';
	import { calcularRacha } from '$lib/motor/racha';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { etiquetaTipoSesion, etiquetaPatron } from '$lib/catalogo/etiquetas';
	import { contarProgresoSemana } from '$lib/ui/progreso-semanal';
	import { formatearSemanas, formatearDias } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import Llama from '$lib/components/iconos/Llama.svelte';
	import Calendario from '$lib/components/iconos/Calendario.svelte';
	import { numeroSemana } from './semana';

	let heading = $state<HTMLElement>();
	let perfil = $state<Awaited<ReturnType<typeof obtenerPerfil>> | null | undefined>(undefined);
	let estados = $state<Awaited<ReturnType<typeof obtenerEstadosTodos>> | undefined>(undefined);
	let historial = $state<Awaited<ReturnType<typeof obtenerHistorial>> | undefined>(undefined);
	// null = 'sin sesiones' (convencion de obtenerVistaPrevia); undefined = cargando.
	// Sin el mapeo v ?? null, un usuario nuevo (tabla vacia) queda en
	// 'Cargando...' para siempre: la query emite undefined, igual al inicial.
	let ultimaSesion = $state<Awaited<ReturnType<typeof obtenerUltimaSesion>> | null | undefined>(undefined);
	let pospuestoLocal = $state<boolean>(false);
	let recomendacionMedica = $state<boolean>(false);
	let cargando = $state(false);

	$effect(() => {
		const sub = liveQuery(() => obtenerPerfil()).subscribe({
			next: (v) => { perfil = v ?? null; },
			error: () => { anunciarError('ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosTodos()).subscribe({
			next: (v) => { estados = v; },
			error: () => { anunciarError('ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerHistorial()).subscribe({
			next: (v) => { historial = v; },
			error: () => { anunciarError('ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		const sub = liveQuery(() => obtenerUltimaSesion()).subscribe({
			next: (v) => { ultimaSesion = v ?? null; },
			error: () => { anunciarError('ERR-DB-READ'); },
		});
		return () => sub.unsubscribe();
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Se anuncia UNA vez por montaje: sin la guarda, cada emision de los
	// liveQuery re-dispara el anuncio (ruido para el lector de pantalla).
	let dashboardAnunciado = false;
	$effect(() => {
		if (!dashboardAnunciado && perfil && estados && historial && ultimaSesion !== undefined) {
			dashboardAnunciado = true;
			anunciarPolite('Inicio listo');
		}
	});

	let vistaPrevia = $derived(
		perfil && estados && historial && ultimaSesion !== undefined
			? obtenerVistaPrevia(perfil, estados, historial, ultimaSesion, [...obtenerCatalogo()], Date.now())
			: undefined,
	);
	let vencidos = $derived(estados ? bloqueosVencidos(estados, Date.now()) : []);

	async function manejarResolver(id: string) {
		cargando = true;
		try {
			await marcarResuelto(id, Date.now());
			anunciarPolite('Ejercicio habilitado de nuevo');
			sonar('ejercicio-desbloqueado');
		} catch {
			anunciarError('ERR-DB-WRITE');
		} finally {
			cargando = false;
		}
	}

	async function manejarReprogramar(id: string) {
		cargando = true;
		try {
			await reprogramarRevision(id, Date.now());
			anunciarPolite('Pusimos la revisión en 28 días. Si el dolor sigue, consulta al médico.');
			recomendacionMedica = true;
		} catch {
			anunciarError('ERR-DB-WRITE');
		} finally {
			cargando = false;
		}
	}

	function manejarPosponer() {
		pospuestoLocal = true;
	}
</script>

<svelte:head>
	<title>Tu entrenamiento{perfil?.nombre ? `, ${perfil.nombre}` : ''}</title>
</svelte:head>

<h1 tabindex="-1" bind:this={heading}>Tu entrenamiento{perfil?.nombre ? `, ${perfil.nombre}` : ''}</h1>

{#if perfil === undefined || estados === undefined || historial === undefined || ultimaSesion === undefined}
	<p>Cargando...</p>
{:else if perfil === null}
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>Completar el registro</Boton>
{:else}
	{@const racha = calcularRacha(historial, perfil.dias_semana, Date.now())}
	{@const completadas = historial.filter((s) => !s.cancelada_por_dolor).length}
	<div class="space-y-4">
		{#if vencidos.length > 0 && !pospuestoLocal}
			{@const bloqueado = vencidos[0]}
			{@const ejercicio = obtenerEjercicio(bloqueado.ejercicio_id)}
			<Card titulo="Ejercicio bloqueado">
				<p>Hace 28 días bloqueamos {ejercicio?.nombre ?? bloqueado.ejercicio_id} por molestia en {bloqueado.razon_bloqueo?.replace('Dolor en ', '') ?? 'alguna zona'}. ¿Cómo está esa zona ahora?</p>
				<div class="flex flex-col gap-2 mt-2">
					<Boton variante="primario" onclick={() => manejarResolver(bloqueado.ejercicio_id)} deshabilitado={cargando} silencioso>Sin dolor, me recuperé</Boton>
					<Boton variante="secundario" onclick={() => manejarReprogramar(bloqueado.ejercicio_id)} deshabilitado={cargando}>Sigue molestando</Boton>
					<Boton variante="secundario" onclick={manejarPosponer} deshabilitado={cargando}>Lo decido más tarde</Boton>
				</div>
			</Card>
		{/if}
		{#if recomendacionMedica}
			<Card titulo="Atención">
				<p>Si el dolor sigue, consulta al médico antes de volver a entrenar.</p>
			</Card>
		{/if}
		<section class="flex flex-col gap-3">
			<Boton variante="primario" tamano="grande" onclick={() => goto(resolve('/sesion'))}>Empezar entrenamiento</Boton>
			{#if vistaPrevia}
				<Card titulo="Tu próxima sesión">
					<p class="tabular-nums">{etiquetaTipoSesion(vistaPrevia.tipo)}, {vistaPrevia.plan.length} ejercicios, ~{perfil.duracion_sesion_min} minutos</p>
					{#if vistaPrevia.patrones_sin_pool.length > 0}
						<p>Hoy no hay ejercicios disponibles para algunos patrones ({vistaPrevia.patrones_sin_pool.map((p) => etiquetaPatron(p)).join(', ')}).</p>
					{/if}
				</Card>
			{/if}
		</section>
		<Card titulo="Progreso">
			<div class="flex items-center gap-2 tabular-nums">
				<Calendario />
				<p class="m-0">{perfil.fecha_primera_sesion === null ? 'Arrancando' : `Semana ${numeroSemana(perfil.fecha_primera_sesion, Date.now())}`}</p>
			</div>
			{#if completadas > 0}
				{@const progreso = contarProgresoSemana(historial, perfil.dias_semana, Date.now())}
				<p class="m-0 tabular-nums">Vas {progreso.hechas} de {formatearDias(progreso.meta)} esta semana</p>
				{#if racha > 0}
					<div class="flex items-center gap-2 tabular-nums">
						<Llama clase="text-naranja" />
						<p class="m-0">Racha: <span class="text-naranja">{formatearSemanas(racha)}</span></p>
					</div>
				{:else if progreso.hechas === 0}
					<p class="m-0 tabular-nums">Todavía no armaste racha; entrena tus {formatearDias(perfil.dias_semana)} esta semana</p>
				{/if}
			{:else}
				<p class="m-0">Todavía no tienes sesiones. Arranca con la primera y arma la racha.</p>
			{/if}
		</Card>
	</div>
{/if}