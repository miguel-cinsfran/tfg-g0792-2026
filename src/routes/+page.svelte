<script lang="ts">
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { obtenerEstadosTodos, marcarResuelto, reprogramarRevision, PREFIJO_RAZON_DOLOR } from '$lib/db/estado';
	import { obtenerHistorial, obtenerUltimaSesion } from '$lib/db/sesiones';
	import { obtenerSesionEnCurso } from '$lib/db/sesion-en-curso';
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
	import { M, formatearDias } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import Llama from '$lib/components/iconos/Llama.svelte';
	import Calendario from '$lib/components/iconos/Calendario.svelte';
	import { numeroSemana } from './semana';
	import {
		consejoDelArranque,
		consejoAnunciado,
		marcarConsejoAnunciado,
	} from '$lib/consejos/estado';
	import { consejosActivados, anuncioConsejoActivado } from '$lib/consejos/preferencias';

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
	// Aviso de sesion sin terminar: se consulta UNA vez al entrar, como
	// el respaldo de /sesion. La marca de tiempo es la misma Date.now()
	// que usa el resto de la pantalla.
	let sesionEnCurso = $state(false);
	$effect(() => {
		obtenerSesionEnCurso(Date.now()).then(
			(r) => { sesionEnCurso = r !== null; },
			() => { sesionEnCurso = false; },
		);
	});

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
			anunciarPolite(M.inicio.anuncioInicioListo);
		}
	});

	// La seleccion vive en el modulo (estable por arranque): $derived la
	// lee una vez y queda fija para la visita.
	let consejo = $derived(consejoDelArranque());
	// 1,5 s dejan pasar la lectura del h1 y el anuncio de "Inicio listo".
	$effect(() => {
		if (!consejo || !consejosActivados() || !anuncioConsejoActivado() || consejoAnunciado()) {
			return;
		}
		const texto = consejo.texto;
		const timer = setTimeout(() => {
			anunciarPolite(texto);
			marcarConsejoAnunciado();
		}, 1500);
		return () => clearTimeout(timer);
	});

	let vistaPrevia = $derived(
		perfil && estados && historial && ultimaSesion !== undefined
			? obtenerVistaPrevia(perfil, estados, historial, ultimaSesion, [...obtenerCatalogo()], Date.now())
			: undefined,
	);
	let vencidos = $derived(estados ? bloqueosVencidos(estados, Date.now()) : []);
	// El sufijo con el nombre lo arma la ruta; el módulo compone el título.
	let sufijoTitulo = $derived(perfil?.nombre ? `, ${perfil.nombre}` : '');

	async function manejarResolver(id: string) {
		cargando = true;
		try {
			await marcarResuelto(id, Date.now());
			anunciarPolite(M.inicio.anuncioEjercicioHabilitado);
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
			anunciarPolite(M.inicio.anuncioRevisionReprogramada);
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
	<title>{M.inicio.titulo(sufijoTitulo)}</title>
</svelte:head>

<h1 tabindex="-1" bind:this={heading}>{M.inicio.titulo(sufijoTitulo)}</h1>

{#if perfil === undefined || estados === undefined || historial === undefined || ultimaSesion === undefined}
	<p>{M.inicio.cargando}</p>
{:else if perfil === null}
	<Boton variante="primario" onclick={() => goto(resolve('/onboarding'))}>{M.inicio.botonCompletarRegistro}</Boton>
{:else}
	{@const racha = calcularRacha(historial, perfil.dias_semana, Date.now())}
	{@const completadas = historial.filter((s) => !s.cancelada_por_dolor).length}
	<div class="space-y-4">
		{#if vencidos.length > 0 && !pospuestoLocal}
			{@const bloqueado = vencidos[0]}
			{@const ejercicio = obtenerEjercicio(bloqueado.ejercicio_id)}
			<Card titulo={M.inicio.ejercicioBloqueadoTitulo}>
				<p>{M.inicio.bloqueado(ejercicio?.nombre ?? bloqueado.ejercicio_id, bloqueado.razon_bloqueo?.replace(PREFIJO_RAZON_DOLOR, '') ?? M.inicio.zonaSinDetalle)}</p>
				<div class="flex flex-col gap-2 mt-2">
					<Boton variante="primario" onclick={() => manejarResolver(bloqueado.ejercicio_id)} deshabilitado={cargando} silencioso>{M.inicio.botonSinDolor}</Boton>
					<Boton variante="secundario" onclick={() => manejarReprogramar(bloqueado.ejercicio_id)} deshabilitado={cargando}>{M.inicio.botonSigueMolestando}</Boton>
					<Boton variante="secundario" onclick={manejarPosponer} deshabilitado={cargando}>{M.inicio.botonLoDecidoMasTarde}</Boton>
				</div>
			</Card>
		{/if}
		{#if recomendacionMedica}
			<Card titulo={M.inicio.atencionTitulo}>
				<p>{M.inicio.atencionTexto}</p>
			</Card>
		{/if}
		<section class="flex flex-col gap-3">
			<Boton variante="primario" tamano="grande" onclick={() => goto(resolve('/sesion'))}>
				{#if sesionEnCurso}
					{M.inicio.botonEmpezarEntrenamientoSesion}
				{:else}
					{M.inicio.botonEmpezarEntrenamiento}
				{/if}
			</Boton>
			{#if vistaPrevia}
				<Card titulo={M.inicio.proximaSesionTitulo}>
					<p class="tabular-nums">{M.inicio.proximaSesionResumen(etiquetaTipoSesion(vistaPrevia.tipo), vistaPrevia.plan.length, perfil.duracion_sesion_min * 60)}</p>
					{#if vistaPrevia.patrones_sin_pool.length > 0}
						<p>{M.inicio.patronesSinPool(vistaPrevia.patrones_sin_pool.map((p) => etiquetaPatron(p)).join(', '))}</p>
					{/if}
				</Card>
			{/if}
		</section>
		<Card titulo={M.inicio.progresoTitulo}>
			<div class="flex items-center gap-2 tabular-nums">
				<Calendario />
				<p class="m-0">{perfil.fecha_primera_sesion === null ? M.inicio.semanaSinEmpezar : M.inicio.semana(numeroSemana(perfil.fecha_primera_sesion, Date.now()))}</p>
			</div>
			{#if completadas > 0}
				{@const progreso = contarProgresoSemana(historial, perfil.dias_semana, Date.now())}
				<p class="m-0 tabular-nums">{M.sesion.progresoCierre(progreso.hechas, progreso.meta)}</p>
				{#if racha > 0}
					<div class="flex items-center gap-2 tabular-nums">
						<Llama clase="text-naranja" />
						<p class="m-0"><span class="text-naranja">{M.sesion.rachaCierre(racha)}</span></p>
					</div>
				{:else if progreso.hechas === 0}
					<p class="m-0 tabular-nums">{M.inicio.sinRacha(formatearDias(perfil.dias_semana))}</p>
				{/if}
			{:else}
				<p class="m-0">{M.progreso.sinSesiones}</p>
			{/if}
		</Card>
		{#if consejo && consejosActivados()}
			<Card titulo={M.inicio.consejo.titulo}>
				<p>{consejo.texto}</p>
			</Card>
		{/if}
	</div>
{/if}