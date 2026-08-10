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
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';

	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let zonasEdit = $state<Zona[]>([]);
	let bloqueados = $state<EstadoEjercicio[] | undefined>(undefined);
	let guardando = $state(false);
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

	// Las zonas arrancan con las que el perfil ya declaro como permanentes.
	let prellenado = false;
	$effect(() => {
		if (prellenado) return;
		if (perfil === null || perfil === undefined) return;
		zonasEdit = [...(perfil.zonas_dolor_preexistente ?? [])];
		prellenado = true;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function guardar() {
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ zonas_dolor_preexistente: [...zonasEdit] });
			avisar(M.configuracion.dolor.avisoGuardado, 'exito');
			goto(resolve('/config'));
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	function cancelar() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.dolor.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.dolor.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.dolor.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.dolor.cargando}</p>
{:else}
	<Cabecera onclick={cancelar}>
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
			bind:valores={zonasEdit}
		/>
		{#if errorEscritura !== null}
			<p>{errorEscritura}</p>
		{/if}
		<div class="mt-4 flex gap-4">
			<Boton variante="secundario" onclick={cancelar} deshabilitado={guardando}>{M.configuracion.cancelar}</Boton>
			<Boton variante="primario" onclick={guardar} deshabilitado={guardando}>{M.configuracion.guardar}</Boton>
		</div>
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
						<ChevronDerecha tamano={20} clase="text-text-secondary shrink-0" />
					</button>
				{/each}
			</div>
		{/if}
	</section>
{/if}
