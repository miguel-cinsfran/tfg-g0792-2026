<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { obtener, pasoPendiente, puedeVisitar, pasoAnterior } from '$lib/onboarding/estado';
	import { construirPerfil, finalizar } from '$lib/onboarding/finalizar';
	import { evaluarNivelInicial, PATRONES_POR_GRUPO } from '$lib/motor/evaluacion';
	import type { ResultadoEvaluacion, GrupoEvaluable } from '$lib/motor/evaluacion';
	import { obtenerVistaPrevia } from '$lib/motor/vista-previa';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { etiquetaTipoSesion, etiquetaZona } from '$lib/catalogo/etiquetas';
	import type { Zona } from '$lib/motor/schema';
	import { mensajePara } from '$lib/errores/mensajes';
	import { M, formatearTiempo } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';

	const RUTA = '/onboarding/resumen';

	const GRUPOS: GrupoEvaluable[] = ['PUSH', 'PULL', 'LEGS', 'CORE'];

	let heading = $state<HTMLElement>();
	let resultado = $state<ResultadoEvaluacion | null>(null);
	let lineasPruebas = $state<string[]>([]);
	let pruebasHechas = $state(0);
	let frasesFuera = $state<string[]>([]);
	let resumenPlan = $state<string | null>(null);
	let lineaPrimeraSesion = $state<string | null>(null);
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

	// Zonas declaradas que tocan ejercicios del grupo, en minusculas
	// para la frase ("el dolor en muñecas"). Si ninguna toca (no pasa
	// con el catalogo real), caen todas las declaradas.
	function zonasDelGrupo(
		grupo: GrupoEvaluable,
		declaradas: Zona[],
		catalogo: ReturnType<typeof obtenerCatalogo>,
	): string {
		const patrones = PATRONES_POR_GRUPO[grupo] as readonly string[];
		const tocadas: Zona[] = [];
		for (const ej of catalogo) {
			if (!patrones.includes(ej.patron)) continue;
			for (const z of ej.zonas_involucradas) {
				if (declaradas.includes(z) && !tocadas.includes(z)) tocadas.push(z);
			}
		}
		const base = tocadas.length > 0 ? tocadas : declaradas;
		return base.map((z) => etiquetaZona(z).toLowerCase()).join(', ');
	}

	// El nivel se recalcula en cada montaje con el estado actual: si la
	// persona volvio atras y corrigio un dato, la re-entrada lo refleja.
	$effect(() => {
		const e = obtener();
		// Local y no `resultado`: el efecto ESCRIBE ese state y leerlo
		// aca mismo seria un loop de actualizaciones.
		const res = evaluarNivelInicial(
			{
				reps_push: e.reps_push!,
				reps_pull: e.reps_pull ?? 0,
				reps_legs: e.reps_legs!,
				segundos_core: e.segundos_core!,
				tiene_anclaje: e.tiene_anclaje!,
			},
			Date.now(),
		);
		resultado = res;
		// Estado incompleto (llegada directa): la guarda redirige; sin
		// resumen parcial que parpadee antes.
		try {
			const { perfil, omitidos } = construirPerfil(e, Date.now());
			const catalogo = [...obtenerCatalogo()];
			const declaradas = e.zonas_dolor_preexistente ?? [];

			const valores: Record<GrupoEvaluable, number | null> = {
				PUSH: e.reps_push,
				PULL: e.tiene_anclaje ? e.reps_pull : null,
				LEGS: e.reps_legs,
				CORE: e.segundos_core,
			};
			const lineas: string[] = [];
			let hechas = 0;
			for (const grupo of GRUPOS) {
				const valor = valores[grupo];
				if (valor !== null) {
					hechas++;
					lineas.push(
						M.onboarding.resumen.lineaPrueba(
							grupo,
							valor,
							res.evaluacion_por_patron[grupo],
						),
					);
				} else if (grupo === 'PULL' && !e.tiene_anclaje) {
					lineas.push(M.onboarding.resumen.pruebaSinAnclaje);
				} else {
					lineas.push(
						M.onboarding.resumen.pruebaSalteadaDolor(
							grupo,
							zonasDelGrupo(grupo, declaradas, catalogo),
						),
					);
				}
			}
			lineasPruebas = lineas;
			pruebasHechas = hechas;
			void omitidos;

			const vista = obtenerVistaPrevia(
				// Provisorio para la vista previa: no se persiste (el id
				// real lo pone Dexie al finalizar, como en finalizar.ts).
				{ ...perfil, id: 1 },
				[],
				[],
				null,
				catalogo,
				Date.now(),
			);
			const frases: string[] = [];
			const fuera = vista.patrones_fuera_del_plan;
			if (
				!e.tiene_anclaje &&
				fuera.some((p) => p === 'PULL_H' || p === 'PULL_V')
			) {
				frases.push(M.onboarding.resumen.fraseFueraPorAnclaje);
			}
			const restoFuera = e.tiene_anclaje
				? fuera
				: fuera.filter((p) => p !== 'PULL_H' && p !== 'PULL_V');
			if (declaradas.length > 0 && restoFuera.length > 0) {
				frases.push(
					M.onboarding.resumen.fraseFueraPorDolor(
						declaradas.map((z) => etiquetaZona(z).toLowerCase()).join(', '),
					),
				);
			}
			frasesFuera = frases;

			resumenPlan = M.onboarding.resumen.planResumen(
				e.dias_semana!,
				formatearTiempo(e.duracion_sesion_min! * 60),
			);
			const nombres = vista.plan.map(
				(item) => obtenerEjercicio(item.ejercicio_id)?.nombre ?? item.ejercicio_id,
			);
			lineaPrimeraSesion =
				nombres.length > 0
					? M.onboarding.resumen.primeraSesion(
							etiquetaTipoSesion(vista.tipo).toLowerCase(),
							nombres.join(', '),
						)
					: null;
		} catch {
			lineasPruebas = [];
			pruebasHechas = 0;
			frasesFuera = [];
			resumenPlan = null;
			lineaPrimeraSesion = null;
		}
	});

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoAnterior('/onboarding/resumen') ?? '/onboarding/evaluacion/core');
	}

	async function empezar() {
		finalizando = true;
		errorMsg = null;
		try {
			await finalizar(obtener(), Date.now());
			goto(resolve('/sesion'));
		} catch {
			const msg = mensajePara('ERR-DB-WRITE');
			anunciarAssertive(msg);
			errorMsg = msg;
			finalizando = false;
		}
	}
</script>

<svelte:head><title>{M.onboarding.resumen.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.resumen.titulo}</h1>
</Cabecera>

{#if resultado}
	<div class="space-y-6">
		<Card titulo={M.onboarding.resumen.tituloNivel}>
			<p class="mt-1 text-4xl font-bold text-acento">
				{M.onboarding.resumen.nivel[resultado.nivel_global]}
			</p>
			<p class="m-0 mt-2">
				{M.onboarding.resumen.fraseNivel(resultado.nivel_global, pruebasHechas)}
			</p>
		</Card>

		{#if resultado.ajuste_desbalance_activo !== null}
			<Card titulo={M.onboarding.resumen.tituloPatronReforzar}>
				<p>
					{M.onboarding.resumen.patronDebil(resultado.ajuste_desbalance_activo.patron)}
				</p>
			</Card>
		{/if}

		{#if lineasPruebas.length > 0}
			<Card titulo={M.onboarding.resumen.tituloPruebas}>
				<ul class="m-0 p-0 list-none flex flex-col gap-1">
					{#each lineasPruebas as linea (linea)}
						<li class="text-text-primary">{linea}</li>
					{/each}
				</ul>
			</Card>
		{/if}

		{#if frasesFuera.length > 0 || resumenPlan !== null}
			<Card titulo={M.onboarding.resumen.tituloPlan}>
				{#each frasesFuera as frase (frase)}
					<p class="m-0 mt-2 first:mt-0">{frase}</p>
				{/each}
				{#if resumenPlan !== null}
					<p class="m-0 mt-2">{resumenPlan}</p>
				{/if}
				{#if lineaPrimeraSesion !== null}
					<p class="m-0 mt-2">{lineaPrimeraSesion}</p>
				{/if}
			</Card>
		{/if}

		{#if errorMsg}
			<p class="text-error">{errorMsg}</p>
		{/if}
	</div>
	<BarraAccion>
		{#snippet primaria()}
			<Boton variante="primario" tamano="grande" onclick={empezar} deshabilitado={finalizando} avance>
				{M.onboarding.resumen.botonEmpezar}
			</Boton>
		{/snippet}
		{#snippet secundaria()}
			<Boton variante="secundario" onclick={() => goto(resolve('/ayuda/[tema]', { tema: 'plan' }))}>
				{M.onboarding.resumen.botonAyuda}
			</Boton>
		{/snippet}
	</BarraAccion>
{/if}
