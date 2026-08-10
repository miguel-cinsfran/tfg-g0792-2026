<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil } from '$lib/db/consultas';
	import { actualizarPerfil } from '$lib/db/perfil';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import type { Perfil } from '$lib/motor/schema';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	const DIAS = [2, 3, 4, 5];
	const DURACIONES = [20, 30, 45];

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let diasSeleccionados = $state<number | null>(null);
	let duracionSeleccionada = $state<number | null>(null);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	// Los radios arrancan preseleccionados con la disponibilidad actual.
	let prellenado = false;
	$effect(() => {
		if (prellenado) return;
		if (perfil === null || perfil === undefined) return;
		diasSeleccionados = perfil.dias_semana;
		duracionSeleccionada = perfil.duracion_sesion_min;
		prellenado = true;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function guardar() {
		if (diasSeleccionados === null || duracionSeleccionada === null) return;
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ dias_semana: diasSeleccionados, duracion_sesion_min: duracionSeleccionada });
			avisar(M.configuracion.disponibilidad.avisoGuardado, 'exito');
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

<svelte:head><title>{M.configuracion.disponibilidad.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.disponibilidad.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.disponibilidad.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.disponibilidad.cargando}</p>
{:else}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.disponibilidad.titulo}</h1>
	</Cabecera>
	<fieldset>
		<legend>{M.configuracion.disponibilidad.seleccionaLosDias}</legend>
		{#each DIAS as dia (dia)}
			<div>
				<input type="radio" id="dias-{dia}" name="dias" value={dia} bind:group={diasSeleccionados} />
				<label for="dias-{dia}">{M.configuracion.disponibilidad.opcionDias(dia)}</label>
			</div>
		{/each}
	</fieldset>
	<fieldset class="mt-6">
		<legend>{M.configuracion.disponibilidad.duracionSesion}</legend>
		{#each DURACIONES as d (d)}
			<div>
				<input type="radio" id="duracion-{d}" name="duracion" value={d} bind:group={duracionSeleccionada} />
				<label for="duracion-{d}">{M.configuracion.disponibilidad.opcionDuracion(d)}</label>
			</div>
		{/each}
	</fieldset>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex gap-4">
		<Boton variante="secundario" onclick={cancelar} deshabilitado={guardando}>{M.configuracion.cancelar}</Boton>
		<Boton variante="primario" onclick={guardar} deshabilitado={guardando || diasSeleccionados === null || duracionSeleccionada === null}>{M.configuracion.guardar}</Boton>
	</div>
{/if}
