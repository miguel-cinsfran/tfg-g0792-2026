<script lang="ts">
	// Lista de la biblioteca: un boton por ejercicio que navega al
	// detalle a pantalla completa (/biblioteca/[id]). El acordeon
	// details/summary anterior resulto confuso en la prueba con
	// TalkBack en el Redmi: el detalle quedaba intercalado entre los
	// demas ejercicios.
	import { liveQuery } from 'dexie';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PATRONES } from '$lib/motor/schema';
	import type { Patron, EstadoEjercicio } from '$lib/motor/schema';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEstadosBloqueados } from '$lib/db/estado';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { mensajePara, CODIGO_LECTURA_FALLIDA } from '$lib/errores/mensajes';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import {
		registrarOrigenDetalle,
		leerOrigenDetalle,
		limpiarOrigenDetalle,
	} from '$lib/a11y/origen-detalle.svelte';
	import { M } from '$lib/mensajes/ui';
	import { etiquetaPatron } from '$lib/catalogo/etiquetas';
	import { capitalizar } from '$lib/ui/texto';
	import type { EjercicioValidado } from '$lib/catalogo/schema';
	import Haltera from '$lib/components/iconos/Haltera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';
	import Candado from '$lib/components/iconos/Candado.svelte';
	import Punto from '$lib/components/iconos/Punto.svelte';

	let heading = $state<HTMLElement>();
	// El origen se lee sin seguimiento: limpiarlo tras restaurar el foco
	// no debe re-ejecutar el efecto y arrebatarle el foco al boton.
	$effect(() => {
		const id = untrack(leerOrigenDetalle);
		if (id !== null) {
			const boton = document.getElementById(`ej-${id}`);
			if (boton instanceof HTMLElement) {
				boton.scrollIntoView({ block: 'center' });
				boton.focus();
				limpiarOrigenDetalle();
				return;
			}
		}
		enfocarPrincipal(heading);
	});

	const catalogo = obtenerCatalogo();

	let bloqueos = $state<Map<string, EstadoEjercicio>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosBloqueados()).subscribe({
			next: (lista) => { bloqueos = new Map(lista.map((b) => [b.ejercicio_id, b])); },
			error: () => { anunciarAssertive(mensajePara(CODIGO_LECTURA_FALLIDA)); },
		});
		return () => sub.unsubscribe();
	});

	const grupos = PATRONES
		.map((patron: Patron) => ({
			patron,
			ejercicios: catalogo.filter((e: EjercicioValidado) => e.patron === patron),
		}))
		.filter((g: { patron: Patron; ejercicios: EjercicioValidado[] }) => g.ejercicios.length > 0);

	function abrir(ej: EjercicioValidado): void {
		registrarOrigenDetalle(ej.id);
		goto(resolve('/biblioteca/[id]', { id: ej.id }));
	}
</script>

<svelte:head><title>{M.biblioteca.titulo}</title></svelte:head>
<h1 bind:this={heading} tabindex="-1">{M.biblioteca.titulo}</h1>

{#each grupos as grupo (grupo.patron)}
	<section aria-labelledby="patron-{grupo.patron}">
		<div class="flex items-baseline gap-2 mt-6">
			<h2 id="patron-{grupo.patron}" class="flex items-baseline gap-2">
				<Punto tamano={12} clase="text-text-secondary shrink-0" />
				{capitalizar(etiquetaPatron(grupo.patron))}
			</h2>
			{#if grupo.ejercicios.length > 1}
				<span class="text-sm font-normal text-text-secondary">
					, {grupo.ejercicios.length} ejercicios
				</span>
			{/if}
		</div>
		<ul class="list-none m-0 p-0 mt-2 space-y-2">
			{#each grupo.ejercicios as ej (ej.id)}
				<li>
					<button
						type="button"
						id="ej-{ej.id}"
						class="w-full min-h-12 flex items-center gap-3 text-left bg-surface-alt border border-border-strong rounded-lg px-4 py-3 transition-colors hover:border-acento active:border-acento focus-visible:outline-2 focus-visible:outline-acento group"
						onclick={() => abrir(ej)}
					>
						{#if bloqueos.has(ej.id)}
							<Candado tamano={20} clase="text-text-secondary shrink-0" />
						{:else}
							<Haltera tamano={20} clase="text-text-secondary shrink-0" />
						{/if}
						<div class="flex-1 min-w-0">
							<span class="block font-semibold text-text-primary">
								{ej.nombre}
							</span>
							<span class="block text-sm text-text-secondary">
								{M.biblioteca.nivelDeEjercicio(ej.nivel_requerido, bloqueos.has(ej.id))}
							</span>
						</div>
						<ChevronDerecha tamano={20}
							clase="text-text-secondary shrink-0 transition-transform group-hover:translate-x-0.5" />
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/each}
