<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
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
			casilla?.focus();
			return;
		}
		actualizar({ disclaimer_aceptado: true, fecha_aceptacion_disclaimer: Date.now() });
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- pasoPendiente devuelve rutas internas
		goto(pasoPendiente());
	}
</script>

<svelte:head><title>Antes de empezar</title></svelte:head>

<h1 tabindex="-1" bind:this={heading}>Antes de empezar</h1>

<p>
	Hola. En unos minutos armamos tu plan, a tu medida y sin equipo. Primero, algo para cuidarte.
</p>

<Card titulo="Aviso médico">
	<p>
		Esta app te ayuda a entrenar con tu peso; no reemplaza al médico. Si tienes alguna condición
		de salud o dudas sobre si puedes hacer ejercicio, consulta con un profesional antes de arrancar.
	</p>

	<p class="font-semibold mt-4">No arranques hoy si tienes:</p>
	<ul>
		<li>Dolor fuerte que todavía no sabes a qué se debe.</li>
		<li>Una lesión activa sin el visto bueno de un médico.</li>
		<li>Problemas del corazón sin controlar.</li>
		<li>Mareos o desmayos seguidos.</li>
	</ul>

	<p>
		Mientras entrenas, si sientes dolor en el pecho, te cuesta mucho respirar, te mareas fuerte
		o aparece un dolor agudo en una articulación, detente. Si no se pasa, busca atención médica.
	</p>

	<p>
		Entrenar con tu peso es seguro para la mayoría, pero nadie conoce tu cuerpo como tú: si
		algo no se siente bien, corta.
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
		Leí y entiendo: sé que tengo que consultar al médico si tengo dudas y parar si siento
		dolor anormal.
	</label>
</div>

{#if errorCasilla}
	<p id="error-disclaimer" class="mt-1 text-sm text-error">Marca la casilla para continuar.</p>
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
<details class="mt-8 desplegable">
	<summary class="cursor-pointer">¿Ya usabas la app? Recuperar una copia de seguridad</summary>
	<p class="mt-2">
		Si tienes una copia de seguridad, puedes recuperarla ahora. Reemplaza cualquier dato de esta
		instalación.
	</p>
	<div class="mt-2">
		<ImportarRespaldo
			etiquetaBoton="Recuperar mis datos"
			onImportado={() => {
				void goto(resolve('/'), { invalidateAll: true });
			}}
		/>
	</div>
</details>

<BarraAccion>
	{#snippet primaria()}
		<Boton variante="primario" tamano="grande" onclick={aceptar} avance>Aceptar y continuar</Boton>
	{/snippet}
</BarraAccion>
