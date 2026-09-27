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
	import {
		leerOrigenDetalle,
		limpiarOrigenDetalle,
	} from '$lib/a11y/origen-detalle.svelte';
	import { M } from '$lib/mensajes/ui';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { etiquetaPatron } from '$lib/catalogo/etiquetas';
	import { capitalizar } from '$lib/ui/texto';
	import Boton from '$lib/components/Boton.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import DescripcionEjercicio from '$lib/components/DescripcionEjercicio.svelte';
	import Modal from '$lib/components/Modal.svelte';

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
			anunciarPolite(M.biblioteca.anuncioReactivado(ejercicio.nombre));
		} catch {
			anunciarAssertive(mensajePara('ERR-DB-WRITE'));
		}
		confirmando = false;
	}

	function volver(): void {
		// El sonido lo dispara el BotonVolver. Aca solo navegamos para
		// evitar el doble sonido. Con origen registrado, history.back()
		// (no goto: el navegador restaura el scroll y la lista enfoca
		// el ejercicio de origen); sin origen, el comportamiento de
		// siempre: goto a la lista.
		if (leerOrigenDetalle() !== null) {
			history.back();
		} else {
			limpiarOrigenDetalle();
			goto(resolve('/biblioteca'));
		}
	}
</script>

<svelte:head><title>{ejercicio?.nombre ?? M.biblioteca.tituloRespaldo}</title></svelte:head>

{#if ejercicio}
	<Cabecera onclick={volver}>
		<h1 bind:this={heading} tabindex="-1">{ejercicio.nombre}</h1>
	</Cabecera>
	<p class="text-text-secondary">{M.biblioteca.lineaNivel(capitalizar(etiquetaPatron(ejercicio.patron)), ejercicio.nivel_requerido)}</p>

	{#if bloqueo}
		<p>
			{M.biblioteca.bloqueadoPorDolor(bloqueo.razon_bloqueo)}
			{#if bloqueo.fecha_revision !== null}
				{M.biblioteca.fraseRevision(FORMATO_FECHA.format(bloqueo.fecha_revision))}
			{/if}
		</p>
		<Boton onclick={() => { confirmando = true; }}>{M.biblioteca.botonReactivar}</Boton>
		{#if confirmando}
			<Modal abierto={confirmando} titulo={M.biblioteca.tituloReactivar} alCerrar={() => { confirmando = false; }}>
				<p>{M.biblioteca.confirmarReactivar}</p>
				{#snippet acciones()}
					<Boton onclick={confirmarReactivacion}>{M.biblioteca.botonRehabilitar}</Boton>
					<Boton variante="secundario" onclick={() => { confirmando = false; }}>{M.biblioteca.cancelar}</Boton>
				{/snippet}
			</Modal>
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
			<Modal abierto={true} titulo={M.biblioteca.tituloVariantes} alCerrar={() => { propuesta = null; }}>
				<p>{M.biblioteca.confirmarCambio(destino.nombre)}</p>
				{#snippet acciones()}
					<Boton onclick={confirmarCambio} deshabilitado={guardandoCambio}>{M.biblioteca.botonConfirmarCambio}</Boton>
					<Boton variante="secundario" onclick={() => { propuesta = null; }} deshabilitado={guardandoCambio}>{M.biblioteca.cancelar}</Boton>
				{/snippet}
			</Modal>
		{/if}
	{/if}
{:else}
	<Cabecera onclick={volver}>
		<h1 bind:this={heading} tabindex="-1">{M.biblioteca.tituloNoEncontrado}</h1>
	</Cabecera>
	<p>{M.biblioteca.textoNoEncontrado}</p>
{/if}
