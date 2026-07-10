<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { obtener, actualizar, pasoPendiente, puedeVisitar } from '$lib/onboarding/estado';
	import {
		entero,
		decimalUnaCifra,
		edadDesdeAnio,
		anioDesdeEdad,
		validarNombre,
		validarEdad,
		validarPeso,
		validarAltura,
		alturaACm,
		metrosDesdeCm,
		normalizarNombre
	} from '$lib/onboarding/validacion-datos';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
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
	// La altura se edita en metros, como se escribe.
	let altura = $state(estado.altura_cm != null ? metrosDesdeCm(estado.altura_cm) : '');

	let errorNombre = $state<string | null>(null);
	let errorEdad = $state<string | null>(null);
	let errorPeso = $state<string | null>(null);
	let errorAltura = $state<string | null>(null);

	let anunciado = $state(false);

	const edadNumero = $derived(entero(edad) ?? 0);
	const mayorDe40 = $derived(edadNumero >= 40);

	$effect(() => {
		if (mayorDe40 && !anunciado) {
			anunciarPolite('Si tienes 40 años o más, considera una consulta médica previa.');
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
		if (errorAltura !== null && validarAltura(altura)) errorAltura = null;
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
		const alturaValida = validarAltura(altura);

		if (!nombreValido) errorNombre = 'Escribe tu nombre.';
		if (!edadValida) errorEdad = 'Escribe tu edad en años, entre 14 y 100.';
		if (!pesoValido)
			errorPeso =
				'Escribe tu peso en kilos, entre 20 y 300. Puedes usar un decimal para los gramos (por ejemplo 66.8).';
		if (!alturaValida)
			errorAltura = 'Escribe tu altura en metros (por ejemplo 1,60), o déjala vacía.';

		if (nombreValido && edadValida && pesoValido && alturaValida) {
			const patch: Parameters<typeof actualizar>[0] = {
				nombre: normalizarNombre(nombre),
				anio_nacimiento: anioDesdeEdad(entero(edad) as number, anioActual),
				peso_kg: decimalUnaCifra(peso) as number
			};
			if (altura.trim() !== '') {
				patch.altura_cm = alturaACm(altura) as number;
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
			document.getElementById(primerErrorId)?.focus();
		}
	}

	function atras() {
		goto(resolve('/onboarding/disclaimer'));
	}
</script>

<svelte:head><title>Tus datos</title></svelte:head>

<BotonVolver onclick={atras} />

<h1 tabindex="-1" bind:this={heading}>Tus datos</h1>

<form onsubmit={manejarEnvio} novalidate>
	<div class="space-y-6">
		<Card titulo="Sobre ti">
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

		<Card titulo="Medidas">
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
							inputmode="decimal"
							pattern={'[0-9]+([.,][0-9]{1,2})?'}
							autocomplete="off"
							id="altura"
							bind:value={altura}
							aria-invalid={errorAltura !== null ? 'true' : undefined}
							aria-describedby={'unidad-altura' + (errorAltura !== null ? ' error-altura' : '')}
						/>
						<span id="unidad-altura" class="text-text-secondary shrink-0">m</span>
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
			<p class="text-sm">Si tienes 40 años o más, considera una consulta médica previa.</p>
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
			Continuar
		</Boton>
	{/snippet}
</BarraAccion>
