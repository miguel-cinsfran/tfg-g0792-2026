<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil } from '$lib/db/consultas';
	import { actualizarPerfil } from '$lib/db/perfil';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import { OBJETIVOS, type Objetivo, type Perfil } from '$lib/motor/schema';
	import { etiquetaObjetivo, descripcionObjetivo } from '$lib/catalogo/etiquetas';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let objetivoSeleccionado = $state<Objetivo | null>(null);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	// El radio arranca preseleccionado con el objetivo actual del perfil.
	let prellenado = false;
	$effect(() => {
		if (prellenado) return;
		if (perfil === null || perfil === undefined) return;
		objetivoSeleccionado = perfil.objetivo;
		prellenado = true;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function guardar() {
		if (objetivoSeleccionado === null) return;
		guardando = true;
		errorEscritura = null;
		try {
			await actualizarPerfil({ objetivo: objetivoSeleccionado });
			avisar(M.configuracion.objetivo.avisoGuardado, 'exito');
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

<svelte:head><title>{M.configuracion.objetivo.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.objetivo.cargando}</p>
{:else}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<fieldset>
		<legend>{M.configuracion.objetivo.seleccionaTuObjetivo}</legend>
		{#each OBJETIVOS as obj (obj)}
			<div>
				<input type="radio" id="obj-{obj}" name="objetivo" value={obj} bind:group={objetivoSeleccionado} />
				<label for="obj-{obj}">
					<strong>{etiquetaObjetivo(obj)}</strong>
					<span>: {descripcionObjetivo(obj)}</span>
				</label>
			</div>
		{/each}
	</fieldset>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
	<div class="mt-6 flex gap-4">
		<Boton variante="secundario" onclick={cancelar} deshabilitado={guardando}>{M.configuracion.cancelar}</Boton>
		<Boton variante="primario" onclick={guardar} deshabilitado={guardando || objetivoSeleccionado === null}>{M.configuracion.guardar}</Boton>
	</div>
{/if}
