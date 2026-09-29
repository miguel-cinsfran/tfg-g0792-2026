<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';
	import ImportarRespaldo from '$lib/components/ImportarRespaldo.svelte';

	const RUTA = '/onboarding/disclaimer';

	let heading = $state<HTMLElement>();
	let casilla = $state<HTMLInputElement>();
	let acepto = $state(obtener().disclaimer_aceptado);
	let errorCasilla = $state(false);

	$effect(() => {
		if (!puedeVisitar(RUTA)) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- pasoPendiente devuelve rutas internas
			goto(pasoPendiente(), { replaceState: true });
		}
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function aceptar() {
		if (!acepto) {
			errorCasilla = true;
			anunciarAssertive(M.onboarding.disclaimer.casillaError);
			casilla?.focus();
			return;
		}
		actualizar({ disclaimer_aceptado: true, fecha_aceptacion_disclaimer: Date.now() });
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pasoPendiente devuelve rutas internas
		goto(pasoPendiente());
	}
</script>

<svelte:head><title>{M.onboarding.disclaimer.titulo}</title></svelte:head>

<h1 tabindex="-1" bind:this={heading}>{M.onboarding.disclaimer.titulo}</h1>

<p>
	{M.onboarding.disclaimer.introduccion}
</p>

<Card titulo={M.onboarding.disclaimer.avisoTitulo}>
	<p>
		{M.onboarding.disclaimer.avisoCuerpo}
	</p>

	<p>
		{M.onboarding.disclaimer.tecnicaCuerpo}
	</p>

	<p class="font-semibold mt-4">{M.onboarding.disclaimer.noEntrenesTitulo}</p>
	<ul>
		{#each M.onboarding.disclaimer.noEntrenesItems as item (item)}
			<li>{item}</li>
		{/each}
	</ul>

	<p>
		{M.onboarding.disclaimer.duranteCuerpo}
	</p>

	<p>
		{M.onboarding.disclaimer.cerrarCuerpo}
	</p>
</Card>

<div class="mt-4 flex items-start gap-2">
	<input
		type="checkbox"
		id="cb-disclaimer"
		bind:this={casilla}
		bind:checked={acepto}
		onchange={() => {
			if (acepto) errorCasilla = false;
		}}
		aria-invalid={errorCasilla ? 'true' : undefined}
		aria-describedby={errorCasilla ? 'error-disclaimer' : undefined}
	/>
	<label for="cb-disclaimer">
		{M.onboarding.disclaimer.casillaLabel}
	</label>
</div>

{#if errorCasilla}
	<p id="error-disclaimer" class="mt-1 text-sm text-error">{M.onboarding.disclaimer.casillaError}</p>
{/if}

<!-- Acceso discreto a recuperar una copia de seguridad. El <details>
     colapsado mantiene la bienvenida y "Aceptar y continuar" al frente:
     el usuario nuevo, que no tiene archivo, lo ve cerrado y lo ignora;
     el que reinstalo lo abre. Importar no exige la casilla de
     consentimiento: el respaldo restaura el perfil completo, que ya
     trae el consentimiento aceptado antes; re-importar los propios
     datos no es un nuevo evento de consentimiento. Tras importar, se
     invalida el load del layout para que el perfil recien cargado se
     refleje en la UI (sin location.reload). -->
<details class="mt-8 desplegable desplegable-fila">
	<summary>{M.onboarding.disclaimer.respaldoTitulo}</summary>
	<p class="mt-2">
		{M.onboarding.disclaimer.respaldoCuerpo}
	</p>
	<div class="mt-2">
		<ImportarRespaldo
			etiquetaBoton={M.onboarding.disclaimer.respaldoBoton}
			onImportado={() => {
				void goto(resolve('/'), { invalidateAll: true });
			}}
		/>
	</div>
</details>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={aceptar} avance>{M.onboarding.disclaimer.botonContinuar}</Boton>
	{/snippet}
</BarraAccion>
