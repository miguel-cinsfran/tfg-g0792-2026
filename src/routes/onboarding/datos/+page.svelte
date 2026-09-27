<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite, anunciarAssertive } from '$lib/a11y/live-region';
	import { M } from '$lib/mensajes/ui';
	import { obtener, actualizar, pasoPendiente, puedeVisitar, pasoAnterior } from '$lib/onboarding/estado';
	import {
		entero,
		decimalUnaCifra,
		edadDesdeAnio,
		anioDesdeEdad,
		validarNombre,
		validarEdad,
		validarPeso,
		validarAlturaCm,
		alturaCmDesdeTexto,
		normalizarNombre,
		MENSAJE_NOMBRE_VACIO,
		MENSAJE_EDAD_INVALIDA,
		MENSAJE_PESO_INVALIDO
	} from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Card from '$lib/components/Card.svelte';
	import BarraAccion from '$lib/components/BarraAccion.svelte';

	const RUTA = '/onboarding/datos';

	let heading = $state<HTMLElement>();
	const anioActual = new Date().getFullYear();

	let estado = $state(obtener());
	let nombre = $state(estado.nombre ?? '');
	// Numericos como texto + inputmode=numeric: type=number emite cadena
	// vacia cuando el navegador no valida lo tecleado y se anuncia como
	// spinner.
	let edad = $state(
		estado.anio_nacimiento !== null
			? edadDesdeAnio(estado.anio_nacimiento, anioActual).toString()
			: ''
	);
	let peso = $state(estado.peso_kg?.toString() ?? '');
	// La altura se escribe en centimetros enteros, como se dice.
	let altura = $state(estado.altura_cm != null ? String(estado.altura_cm) : '');

	let errorNombre = $state<string | null>(null);
	let errorEdad = $state<string | null>(null);
	let errorPeso = $state<string | null>(null);
	let errorAltura = $state<string | null>(null);

	let anunciado = $state(false);

	const edadNumero = $derived(entero(edad) ?? 0);
	const mayorDe40 = $derived(edadNumero >= 40);

	$effect(() => {
		if (mayorDe40 && !anunciado) {
			anunciarPolite(M.onboarding.datos.avisoEdad);
			anunciado = true;
		}
		if (!mayorDe40) {
			anunciado = false;
		}
	});

	// Limpia el error individual cuando el campo se vuelve valido
	$effect(() => {
		if (errorNombre !== null && validarNombre(nombre)) errorNombre = null;
	});
	$effect(() => {
		if (errorEdad !== null && validarEdad(edad)) errorEdad = null;
	});
	$effect(() => {
		if (errorPeso !== null && validarPeso(peso)) errorPeso = null;
	});
	$effect(() => {
		if (errorAltura !== null && validarAlturaCm(altura)) errorAltura = null;
	});

	$effect(() => {
		if (!puedeVisitar(RUTA)) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(pasoPendiente(), { replaceState: true });
		}
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function manejarEnvio(e?: Event) {
		e?.preventDefault();

		errorNombre = null;
		errorEdad = null;
		errorPeso = null;
		errorAltura = null;

		const nombreValido = validarNombre(nombre);
		const edadValida = validarEdad(edad);
		const pesoValido = validarPeso(peso);
		const alturaValida = validarAlturaCm(altura);

		if (!nombreValido) errorNombre = MENSAJE_NOMBRE_VACIO;
		if (!edadValida) errorEdad = MENSAJE_EDAD_INVALIDA;
		if (!pesoValido) errorPeso = MENSAJE_PESO_INVALIDO;
		if (!alturaValida) errorAltura = M.onboarding.datos.errorAlturaCm;

		if (nombreValido && edadValida && pesoValido && alturaValida) {
			const patch: Parameters<typeof actualizar>[0] = {
				nombre: normalizarNombre(nombre),
				anio_nacimiento: anioDesdeEdad(entero(edad) as number, anioActual),
				peso_kg: decimalUnaCifra(peso) as number
			};
			if (altura.trim() !== '') {
				patch.altura_cm = alturaCmDesdeTexto(altura) as number;
			} else {
				patch.altura_cm = null;
			}
			actualizar(patch);
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(pasoPendiente());
		} else {
			// Foco al primer campo con error: nombre -> edad -> peso -> altura
			const primerErrorId = !nombreValido
				? 'nombre'
				: !edadValida
					? 'edad'
					: !pesoValido
						? 'peso'
						: 'altura';
			// En esta rama al menos un errorX es string; el narrowing es para TS.
			const primerMensaje = !nombreValido
				? errorNombre
				: !edadValida
					? errorEdad
					: !pesoValido
						? errorPeso
						: errorAltura;
			if (primerMensaje !== null) {
				anunciarAssertive(primerMensaje);
			}
			document.getElementById(primerErrorId)?.focus();
		}
	}

	function atras() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(pasoAnterior('/onboarding/datos') ?? resolve('/onboarding/disclaimer'));
	}
</script>

<svelte:head><title>{M.onboarding.datos.titulo}</title></svelte:head>

<Cabecera onclick={atras}>
	<h1 tabindex="-1" bind:this={heading}>{M.onboarding.datos.titulo}</h1>
</Cabecera>

<form onsubmit={manejarEnvio} novalidate>
	<div class="space-y-6">
		<Card titulo={M.onboarding.datos.sobreTi}>
			<div class="space-y-4">
				<div>
					<label for="nombre">Nombre</label>
					<input
						type="text"
						id="nombre"
						bind:value={nombre}
						autocomplete="name"
						autocapitalize="words"
						aria-invalid={errorNombre !== null ? 'true' : undefined}
						aria-describedby={errorNombre !== null ? 'error-nombre' : undefined}
						required
					/>
					{#if errorNombre}
						<p id="error-nombre" class="mt-1 text-sm text-error">
							{errorNombre}
						</p>
					{/if}
				</div>
			</div>
		</Card>

		<Card titulo={M.onboarding.datos.medidas}>
			<div class="space-y-4">
				<div>
					<label for="edad">Edad</label>
					<input
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						autocomplete="off"
						id="edad"
						bind:value={edad}
						aria-invalid={errorEdad !== null ? 'true' : undefined}
						aria-describedby={errorEdad !== null ? 'error-edad' : undefined}
						required
					/>
					{#if errorEdad}
						<p id="error-edad" class="mt-1 text-sm text-error">
							{errorEdad}
						</p>
					{/if}
				</div>
				<div>
					<label for="peso">Peso</label>
					<div class="flex items-center gap-2">
						<input
							type="text"
							inputmode="decimal"
							pattern="[0-9]+([.,][0-9])?"
							autocomplete="off"
							id="peso"
							bind:value={peso}
							aria-invalid={errorPeso !== null ? 'true' : undefined}
							aria-describedby={'unidad-peso' + (errorPeso !== null ? ' error-peso' : '')}
							required
						/>
						<span id="unidad-peso" class="text-text-secondary shrink-0">kg</span>
					</div>
					{#if errorPeso}
						<p id="error-peso" class="mt-1 text-sm text-error">
							{errorPeso}
						</p>
					{/if}
				</div>
				<div>
					<label for="altura">Altura</label>
					<div class="flex items-center gap-2">
						<input
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="off"
							id="altura"
							bind:value={altura}
							aria-invalid={errorAltura !== null ? 'true' : undefined}
							aria-describedby={'unidad-altura' + (errorAltura !== null ? ' error-altura' : '')}
						/>
						<span id="unidad-altura" class="text-text-secondary shrink-0">cm</span>
					</div>
					{#if errorAltura}
						<p id="error-altura" class="mt-1 text-sm text-error">
							{errorAltura}
						</p>
					{/if}
				</div>
			</div>
		</Card>

		{#if mayorDe40}
			<p class="text-sm">{M.onboarding.datos.avisoEdad}</p>
		{/if}
	</div>
</form>
<BarraAccion>
	{#snippet primaria()}
		<!-- type="button" porque vive fuera del <form> (la barra va al
		     final del DOM). La validacion y la navegacion van por
		     manejarEnvio. El form sigue existiendo para soportar submit
		     con Enter desde cualquier input. -->
		<Boton variante="primario" tamano="grande" type="button" onclick={manejarEnvio} avance>
			{M.onboarding.comun.continuar}
		</Boton>
	{/snippet}
</BarraAccion>
