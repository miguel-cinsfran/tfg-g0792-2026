<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil, suscribirBloqueados } from '$lib/db/consultas';
	import { actualizarPerfil } from '$lib/db/perfil';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import { ZONAS, type Zona, type EstadoEjercicio, type Perfil } from '$lib/motor/schema';
	import { etiquetaZona } from '$lib/catalogo/etiquetas';
	import { M } from '$lib/mensajes/ui';
	import GrupoSeleccionMultiple from '$lib/components/GrupoSeleccionMultiple.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';

	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let zonasElegidas = $state<Zona[]>([]);
	let bloqueados = $state<EstadoEjercicio[] | undefined>(undefined);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	$effect(() => {
		return suscribirBloqueados(
			(v) => { bloqueados = v; },
			(m) => { errorLectura = m; }
		);
	});

	// Las zonas arrancan con las declaradas. Cada cambio se aplica al
	// instante, sin Guardar ni Cancelar: se sale con el Atrás.
	let prellenado = false;
	$effect(() => {
		if (prellenado) return;
		if (perfil === null || perfil === undefined) return;
		zonasElegidas = [...(perfil.zonas_dolor_preexistente ?? [])];
		prellenado = true;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function mismaSeleccion(a: Zona[], b: Zona[]): boolean {
		return a.length === b.length && a.every((z) => b.includes(z));
	}

	function detalle(zonas: Zona[]): string {
		return zonas.length === 0
			? M.configuracion.dolor.ninguna
			: zonas.map((z) => etiquetaZona(z).toLowerCase()).join(', ');
	}

	// Solo dispara ante un cambio real: el prellenado iguala al perfil y
	// la suscripción lo vuelve a igualar tras aplicar.
	$effect(() => {
		const elegidas = zonasElegidas;
		if (!prellenado || perfil === null || perfil === undefined) return;
		if (mismaSeleccion(elegidas, perfil.zonas_dolor_preexistente ?? [])) return;
		void aplicar(elegidas);
	});

	async function aplicar(zonas: Zona[]) {
		errorEscritura = null;
		try {
			await actualizarPerfil({ zonas_dolor_preexistente: [...zonas] });
			avisar(M.configuracion.dolor.avisoAplicado(detalle(zonas)), 'exito');
		} catch (e) {
			// Vuelve a lo guardado: el grupo muestra lo elegido, no lo
			// que quedó.
			zonasElegidas = [...(perfil?.zonas_dolor_preexistente ?? [])];
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		}
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.dolor.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.dolor.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.dolor.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.dolor.cargando}</p>
{:else}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.dolor.titulo}</h1>
	</Cabecera>

	<section aria-labelledby="sec-dolor-zonas" class="mt-4">
		<h2 id="sec-dolor-zonas">{M.configuracion.dolor.zonasPermanentes}</h2>
		<p>{M.configuracion.dolor.explicacion}</p>
		<GrupoSeleccionMultiple
			id="grupo-zonas-config"
			leyenda={M.configuracion.dolor.leyendaZonas}
			nombre="zonas-config"
			opciones={ZONAS.map((zona) => ({ valor: zona, etiqueta: etiquetaZona(zona) }))}
			bind:valores={zonasElegidas}
		/>
		{#if errorEscritura !== null}
			<p>{errorEscritura}</p>
		{/if}
	</section>

	<section aria-labelledby="sec-dolor-bloqueados" class="mt-8">
		<h2 id="sec-dolor-bloqueados">{M.configuracion.dolor.bloqueadosTitulo}</h2>
		{#if bloqueados === undefined}
			<p>{M.configuracion.dolor.cargando}</p>
		{:else if bloqueados.length === 0}
			<p>{M.configuracion.dolor.sinBloqueados}</p>
		{:else}
			<p>{M.configuracion.dolor.detalleBloqueado}</p>
			<div class="flex flex-col gap-2">
				{#each bloqueados as b (b.ejercicio_id)}
					<button
						type="button"
						onclick={() => goto(resolve('/biblioteca/[id]', { id: b.ejercicio_id }))}
						class="fila-configuracion"
					>
						<span class="min-w-0">
							<span class="block truncate">{obtenerEjercicio(b.ejercicio_id)?.nombre ?? b.ejercicio_id}</span>
							{#if b.fecha_revision !== null}
								<span class="block text-sm text-text-secondary">{M.configuracion.dolor.fechaRevision(FORMATO_FECHA.format(b.fecha_revision))}</span>
							{/if}
						</span>
						<ChevronDerecha tamano="1.25em" clase="text-text-secondary shrink-0" />
					</button>
				{/each}
			</div>
		{/if}
	</section>
{/if}
