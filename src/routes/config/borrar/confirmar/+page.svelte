<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import { restablecerBase } from '$lib/db/perfil';
	import { sonar } from '$lib/sonido/reproducir';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	let heading = $state<HTMLElement>();
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function confirmar() {
		guardando = true;
		errorEscritura = null;
		try {
			// Borra las cinco tablas en una sola transaccion. La
			// preferencia de sonido (localStorage) no es dato del usuario
			// y queda fuera.
			await restablecerBase();
			sonar('papelera');
			avisar(M.configuracion.borrarConfirmar.avisoBorrado, 'exito');
			goto(resolve('/onboarding'));
		} catch (e) {
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		} finally {
			guardando = false;
		}
	}

	function volverAlPasoAnterior() {
		goto(resolve('/config/borrar'));
	}

	function conservar() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.borrarConfirmar.titulo}</title></svelte:head>

<Cabecera onclick={volverAlPasoAnterior}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.borrarConfirmar.titulo}</h1>
</Cabecera>
<h2>{M.configuracion.borrarConfirmar.estasSeguro}</h2>
<p>{M.configuracion.borrarConfirmar.explicacion}</p>
{#if errorEscritura !== null}
	<p>{errorEscritura}</p>
{/if}
<div class="mt-6 flex flex-col gap-2">
	<Boton variante="secundario" onclick={conservar} deshabilitado={guardando}>{M.configuracion.borrarConfirmar.botonConservar}</Boton>
	<Boton variante="primario" onclick={confirmar} deshabilitado={guardando} silencioso>{M.configuracion.borrarConfirmar.botonConfirmar}</Boton>
</div>
