<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { suscribirPerfil } from '$lib/db/consultas';
	import { actualizarPerfil } from '$lib/db/perfil';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { mensajePara, CODIGO_ESCRITURA_FALLIDA } from '$lib/errores/mensajes';
	import {
		armarParcheDatos,
		inputsDesdePerfil,
		validarDatosEditados
	} from '$lib/onboarding/validacion-datos';
	import type { Perfil } from '$lib/motor/schema';
	import { M } from '$lib/mensajes/ui';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import Card from '$lib/components/Card.svelte';

	const anioActual = new Date().getFullYear();

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let nombreEdit = $state('');
	let edadEdit = $state('');
	let pesoEdit = $state('');
	let alturaEdit = $state('');
	let errorNombreEdit = $state<string | null>(null);
	let errorEdadEdit = $state<string | null>(null);
	let errorPesoEdit = $state<string | null>(null);
	let errorAlturaEdit = $state<string | null>(null);
	let guardando = $state(false);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	// Los campos arrancan con los datos actuales; el usuario edita sobre
	// ellos. La edad se muestra como edad, no como anio de nacimiento.
	let prellenado = false;
	$effect(() => {
		if (prellenado) return;
		if (perfil === null || perfil === undefined) return;
		const inputs = inputsDesdePerfil(perfil, anioActual);
		nombreEdit = inputs.nombre;
		edadEdit = inputs.edad;
		pesoEdit = inputs.peso;
		alturaEdit = inputs.altura;
		prellenado = true;
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	async function guardar() {
		const resultado = validarDatosEditados(nombreEdit, edadEdit, pesoEdit, alturaEdit);
		errorNombreEdit = resultado.errores.nombre;
		errorEdadEdit = resultado.errores.edad;
		errorPesoEdit = resultado.errores.peso;
		errorAlturaEdit = resultado.errores.altura;

		if (!resultado.valido) {
			// Foco al primer campo con error; el boton siempre es pulsable
			// (un disabled no recibe foco y TalkBack lo salta).
			anunciarAssertive(M.configuracion.datos.avisoValidacion);
			if (resultado.primerError !== null) {
				const id = {
					nombre: 'datos-nombre',
					edad: 'datos-edad',
					peso: 'datos-peso',
					altura: 'datos-altura'
				}[resultado.primerError];
				document.getElementById(id)?.focus();
			}
			return;
		}

		guardando = true;
		errorEscritura = null;
		try {
			const parche = armarParcheDatos(nombreEdit, edadEdit, pesoEdit, alturaEdit, anioActual);
			await actualizarPerfil(parche);
			avisar(M.configuracion.datos.avisoGuardado, 'exito');
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

<svelte:head><title>{M.configuracion.datos.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.datos.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.datos.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.datos.cargando}</p>
{:else}
	<Cabecera onclick={cancelar}>
		<h1 tabindex="-1" bind:this={heading}>{M.configuracion.datos.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.datos.introduccion}</p>
	<form onsubmit={(e) => { e.preventDefault(); void guardar(); }} novalidate>
		<div class="space-y-6">
			<Card titulo={M.configuracion.datos.sobreTi}>
				<div class="space-y-4">
					<div>
						<label for="datos-nombre">Nombre</label>
						<input
							type="text"
							id="datos-nombre"
							bind:value={nombreEdit}
							autocomplete="name"
							autocapitalize="words"
							aria-invalid={errorNombreEdit !== null ? 'true' : undefined}
							aria-describedby={errorNombreEdit !== null ? M.configuracion.datos.campos.errorNombre : undefined}
							required
						/>
						{#if errorNombreEdit}
							<p id="error-datos-nombre" class="mt-1 text-sm text-error">{errorNombreEdit}</p>
						{/if}
					</div>
				</div>
			</Card>
			<Card titulo={M.configuracion.datos.medidas}>
				<div class="space-y-4">
					<div>
						<label for="datos-edad">Edad</label>
						<input
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							autocomplete="off"
							id="datos-edad"
							bind:value={edadEdit}
							aria-invalid={errorEdadEdit !== null ? 'true' : undefined}
							aria-describedby={errorEdadEdit !== null ? M.configuracion.datos.campos.errorEdad : undefined}
							required
						/>
						{#if errorEdadEdit}
							<p id="error-datos-edad" class="mt-1 text-sm text-error">{errorEdadEdit}</p>
						{/if}
					</div>
					<div>
						<label for="datos-peso">Peso</label>
						<div class="flex items-center gap-2">
							<input
								type="text"
								inputmode="decimal"
								pattern="[0-9]+([.,][0-9])?"
								autocomplete="off"
								id="datos-peso"
								bind:value={pesoEdit}
								aria-invalid={errorPesoEdit !== null ? 'true' : undefined}
								aria-describedby={errorPesoEdit !== null ? M.configuracion.datos.campos.unidadPeso + ' ' + M.configuracion.datos.campos.errorPeso : M.configuracion.datos.campos.unidadPeso}
								required
							/>
							<span id="unidad-datos-peso" class="text-text-secondary shrink-0">kg</span>
						</div>
						{#if errorPesoEdit}
							<p id="error-datos-peso" class="mt-1 text-sm text-error">{errorPesoEdit}</p>
						{/if}
					</div>
					<div>
						<label for="datos-altura">Altura</label>
						<div class="flex items-center gap-2">
							<input
								type="text"
								inputmode="decimal"
								pattern={'[0-9]+([.,][0-9]{1,2})?'}
								autocomplete="off"
								id="datos-altura"
								bind:value={alturaEdit}
								aria-invalid={errorAlturaEdit !== null ? 'true' : undefined}
								aria-describedby={errorAlturaEdit !== null ? M.configuracion.datos.campos.unidadAltura + ' ' + M.configuracion.datos.campos.errorAltura : M.configuracion.datos.campos.unidadAltura}
							/>
							<span id="unidad-datos-altura" class="text-text-secondary shrink-0">m</span>
						</div>
						{#if errorAlturaEdit}
							<p id="error-datos-altura" class="mt-1 text-sm text-error">{errorAlturaEdit}</p>
						{/if}
					</div>
				</div>
			</Card>
		</div>
		{#if errorEscritura !== null}
			<p class="mt-4">{errorEscritura}</p>
		{/if}
		<div class="mt-6 flex flex-col gap-2">
			<Boton variante="secundario" onclick={cancelar} deshabilitado={guardando}>{M.configuracion.cancelar}</Boton>
			<Boton variante="primario" type="submit" deshabilitado={guardando}>{M.configuracion.guardar}</Boton>
		</div>
	</form>
{/if}
