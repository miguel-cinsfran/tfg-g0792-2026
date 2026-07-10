<script lang="ts">
	// Detalle de un ejercicio. La barra de pestanas la pone el layout.
	// Tambien vive aca la reactivacion de un ejercicio bloqueado por
	// dolor.
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { EstadoEjercicio, Perfil } from '$lib/motor/schema';
	import { obtenerEjercicio } from '$lib/catalogo/consultas';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEstadosBloqueados, marcarResuelto, guardarEstado } from '$lib/db/estado';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { progresar, retroceder } from '$lib/motor/progresion';
	import { anunciarPolite, anunciarAssertive } from '$lib/a11y/live-region';
	import { mensajePara } from '$lib/errores/mensajes';
	import { M } from '$lib/mensajes/ui';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { etiquetaPatron } from '$lib/catalogo/etiquetas';
	import { capitalizar } from '$lib/ui/texto';
	import Boton from '$lib/components/Boton.svelte';
	import BotonVolver from '$lib/components/BotonVolver.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import ModalDolor from '$lib/components/ModalDolor.svelte';

	const FORMATO_FECHA = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

	let heading = $state<HTMLElement>();
	$effect(() => { enfocarPrincipal(heading); });

	let ejercicio = $derived(obtenerEjercicio(page.params.id ?? ''));

	let bloqueo = $state<EstadoEjercicio | null>(null);
	$effect(() => {
		const id = page.params.id;
		const sub = liveQuery(() => obtenerEstadosBloqueados()).subscribe({
			next: (lista) => { bloqueo = lista.find((b) => b.ejercicio_id === id) ?? null; },
			error: () => { anunciarAssertive(mensajePara('ERR-DB-READ')); },
		});
		return () => sub.unsubscribe();
	});

	let confirmando = $state(false);

	// Cambio de variante: vive aca y no en la sesion porque afecta la
	// PROXIMA sesion, no la de hoy.
	let perfil = $state<Perfil | null>(null);
	$effect(() => {
		obtenerPerfil().then(
			(p) => { perfil = p ?? null; },
			() => { anunciarAssertive(mensajePara('ERR-DB-READ')); },
		);
	});

	let propuesta = $state<ReturnType<typeof progresar> | null>(null);
	let guardandoCambio = $state(false);

	function proponerCambio(dir: 'progresar' | 'retroceder'): void {
		if (!ejercicio || !perfil) return;
		const fn = dir === 'progresar' ? progresar : retroceder;
		const resultado = fn(ejercicio, [...obtenerCatalogo()], perfil.objetivo);
		if (resultado.tipo === 'extremo') {
			anunciarPolite(dir === 'progresar' ? M.biblioteca.extremoDificil : M.biblioteca.extremoFacil);
			propuesta = null;
			return;
		}
		propuesta = resultado;
	}

	async function confirmarCambio(): Promise<void> {
		if (!propuesta || propuesta.tipo !== 'cambio') return;
		guardandoCambio = true;
		try {
			await guardarEstado(propuesta.estado_nuevo);
			const destino = propuesta.destino;
			propuesta = null;
			anunciarPolite(M.biblioteca.cambioHecho(destino.nombre));
			goto(resolve('/biblioteca/[id]', { id: destino.id }));
		} catch {
			anunciarAssertive(mensajePara('ERR-DB-WRITE'));
		} finally {
			guardandoCambio = false;
		}
	}

	async function confirmarReactivacion(): Promise<void> {
		if (!ejercicio) return;
		try {
			await marcarResuelto(ejercicio.id, Date.now());
			anunciarPolite(`${ejercicio.nombre} habilitado de nuevo`);
		} catch {
			anunciarAssertive(mensajePara('ERR-DB-WRITE'));
		}
		confirmando = false;
	}

	function volver(): void {
		// El sonido lo dispara el BotonVolver. Aca solo navegamos para
		// evitar el doble sonido.
		goto(resolve('/biblioteca'));
	}
</script>

<svelte:head><title>{ejercicio?.nombre ?? 'Ejercicio'}</title></svelte:head>

<BotonVolver onclick={volver} />

{#if ejercicio}
	<h1 bind:this={heading} tabindex="-1">{ejercicio.nombre}</h1>
	<p class="text-text-secondary">{capitalizar(etiquetaPatron(ejercicio.patron))}, nivel {ejercicio.nivel_requerido}</p>

	{#if bloqueo}
		<p>
			Este ejercicio está bloqueado por dolor{bloqueo.razon_bloqueo ? ` (${bloqueo.razon_bloqueo.toLowerCase()})` : ''}.
			{#if bloqueo.fecha_revision !== null}
				La app te va a preguntar si mejoró el {FORMATO_FECHA.format(bloqueo.fecha_revision)}.
			{/if}
		</p>
		<Boton onclick={() => { confirmando = true; }}>Reactivar ahora</Boton>
		{#if confirmando}
			<ModalDolor abierto={confirmando} titulo="Reactivar ejercicio" alCerrar={() => { confirmando = false; }}>
				<p>Vuelve a aparecer en tus sesiones. ¿Confirmas?</p>
				{#snippet acciones()}
					<Boton onclick={confirmarReactivacion}>Sí, rehabilitar</Boton>
					<Boton variante="secundario" onclick={() => { confirmando = false; }}>Cancelar</Boton>
				{/snippet}
			</ModalDolor>
		{/if}
	{/if}

	<DescripcionEjercicio descripcion={ejercicio.descripcion} encabezado="h2" />

	{#if perfil && (ejercicio.progresion_id !== null || ejercicio.regresion_id !== null)}
		<h2 class="mt-4">{M.biblioteca.tituloVariantes}</h2>
		<div class="flex flex-col gap-2">
			{#if ejercicio.progresion_id !== null}
				<Boton variante="secundario" onclick={() => proponerCambio('progresar')}>{M.biblioteca.botonVarianteDificil}</Boton>
			{/if}
			{#if ejercicio.regresion_id !== null}
				<Boton variante="secundario" onclick={() => proponerCambio('retroceder')}>{M.biblioteca.botonVarianteFacil}</Boton>
			{/if}
		</div>
		<!-- Confirmacion en dialogo modal, no inline: el reemplazo de
		     botones bajo el dedo desorientaba (QA 0.6.0). -->
		{#if propuesta?.tipo === 'cambio'}
			{@const destino = propuesta.destino}
			<ModalDolor abierto={true} titulo="Cambiar de variante" alCerrar={() => { propuesta = null; }}>
				<p>{M.biblioteca.confirmarCambio(destino.nombre)}</p>
				{#snippet acciones()}
					<Boton onclick={confirmarCambio} deshabilitado={guardandoCambio}>Confirmar el cambio</Boton>
					<Boton variante="secundario" onclick={() => { propuesta = null; }} deshabilitado={guardandoCambio}>Cancelar</Boton>
				{/snippet}
			</ModalDolor>
		{/if}
	{/if}
{:else}
	<h1 bind:this={heading} tabindex="-1">Ejercicio no encontrado</h1>
	<p>El ejercicio que pediste no está en el catálogo.</p>
{/if}
