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
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	const OPCIONES: Array<{ valor: 'si' | 'no'; etiqueta: string }> = [
		{ valor: 'si', etiqueta: 'Sí' },
		{ valor: 'no', etiqueta: 'No' }
	];

	let heading = $state<HTMLElement>();
	let perfil = $state<Perfil | null | undefined>(undefined);
	let errorLectura = $state<string | null>(null);
	let eleccion = $state<'si' | 'no' | null>(null);
	let errorEscritura = $state<string | null>(null);

	$effect(() => {
		return suscribirPerfil(
			(v) => { perfil = v; },
			(m) => { errorLectura = m; }
		);
	});

	// La elección arranca con el valor actual. Cada cambio se aplica al
	// instante, sin Guardar ni Cancelar: se sale con el Atrás. Solo se
	// guarda el dato; la evaluación no se repite.
	$effect(() => {
		if (perfil === null || perfil === undefined) return;
		if (eleccion === null) eleccion = perfil.tiene_anclaje ? 'si' : 'no';
	});

	$effect(() => {
		enfocarPrincipal(heading);
	});

	$effect(() => {
		const elegida = eleccion;
		if (elegida === null || perfil === null || perfil === undefined) return;
		const actual = perfil.tiene_anclaje ? 'si' : 'no';
		if (elegida === actual) return;
		void aplicar(elegida === 'si');
	});

	async function aplicar(tieneAnclaje: boolean) {
		errorEscritura = null;
		try {
			await actualizarPerfil({ tiene_anclaje: tieneAnclaje });
			avisar(M.perfil.resumen.equipo(tieneAnclaje), 'exito');
		} catch (e) {
			// Vuelve a lo guardado: la tarjeta muestra lo elegido, no lo
			// que quedó.
			eleccion = perfil?.tiene_anclaje ? 'si' : 'no';
			errorEscritura = mensajePara((e as { code?: string }).code ?? CODIGO_ESCRITURA_FALLIDA);
			anunciarAssertive(errorEscritura);
		}
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.onboarding.equipamiento.titulo}</title></svelte:head>

{#if errorLectura !== null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.onboarding.equipamiento.titulo}</h1>
	</Cabecera>
	<p>{errorLectura}</p>
{:else if perfil === undefined || eleccion === null}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.onboarding.equipamiento.titulo}</h1>
	</Cabecera>
	<p>{M.configuracion.equipamiento.cargando}</p>
{:else}
	<Cabecera onclick={volver}>
		<h1 tabindex="-1" bind:this={heading}>{M.onboarding.equipamiento.titulo}</h1>
	</Cabecera>
	<p id="explicacion-equipamiento-config" class="mt-2 text-sm text-text-secondary">
		{M.onboarding.equipamiento.explicacion}
	</p>
	<GrupoSeleccion
		leyenda={M.onboarding.equipamiento.leyenda}
		nombre="tiene_anclaje_config"
		opciones={OPCIONES}
		bind:valor={eleccion}
		id="grupo-equipamiento-config"
		descripcionId="explicacion-equipamiento-config"
	/>
	{#if eleccion === 'no'}
		<p class="mt-3 text-sm text-text-secondary">
			{M.onboarding.equipamiento.sinAnclaje}
		</p>
	{/if}
	{#if errorEscritura !== null}
		<p>{errorEscritura}</p>
	{/if}
{/if}
