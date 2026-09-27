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
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let objetivoElegido = $state<Objetivo | null>(null);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	// La elección arranca con el objetivo actual. Cada cambio se aplica
	// al instante, sin Guardar ni Cancelar: se sale con el Atrás.
	$effect(() => {
		if (perfil === null || perfil === undefined) return;
		if (objetivoElegido === null) objetivoElegido = perfil.objetivo;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Solo dispara ante un cambio real: el prellenado iguala al perfil y
	// la suscripción lo vuelve a igualar tras aplicar.
	$effect(() => {
		const elegido = objetivoElegido;
		if (elegido === null || perfil === null || perfil === undefined) return;
		if (elegido === perfil.objetivo) return;
		void aplicar(elegido);
	});

	async function aplicar(objetivo: Objetivo) {
		errorEscritura = null;
		try {
			await actualizarPerfil({ objetivo });
			avisar(M.configuracion.objetivo.avisoAplicado(etiquetaObjetivo(objetivo)), 'exito');
		} catch (e) {
			// Vuelve a lo guardado: la tarjeta muestra lo elegido, no lo
			// que quedó.
			objetivoElegido = perfil?.objetivo ?? null;
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		}
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.objetivo.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined || objetivoElegido === null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.objetivo.cargando}</p>
{:else}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.objetivo.titulo}</h1>
	</Cabecera>
	<GrupoSeleccion
		leyenda={M.configuracion.objetivo.eligeTuObjetivo}
		nombre="objetivo"
		opciones={OBJETIVOS.map((obj) => ({
			valor: obj,
			etiqueta: etiquetaObjetivo(obj),
			descripcion: descripcionObjetivo(obj)
		}))}
		bind:valor={objetivoElegido}
		id="grupo-objetivo-config"
	/>
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
{/if}
