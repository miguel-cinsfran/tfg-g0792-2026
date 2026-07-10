<script lang="ts">
	// Lista de la biblioteca: un boton por ejercicio que navega al
	// detalle a pantalla completa (/biblioteca/[id]). El acordeon
	// details/summary anterior resulto confuso en la prueba con
	// TalkBack en el Redmi: el detalle quedaba intercalado entre los
	// demas ejercicios.
	import { liveQuery } from 'dexie';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PATRONES } from '$lib/motor/schema';
	import type { Patron, EstadoEjercicio } from '$lib/motor/schema';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEstadosBloqueados } from '$lib/db/estado';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { mensajePara } from '$lib/errores/mensajes';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { etiquetaPatron } from '$lib/catalogo/etiquetas';
	import { capitalizar } from '$lib/ui/texto';
	import type { EjercicioValidado } from '$lib/catalogo/schema';
	import Haltera from '$lib/components/iconos/Haltera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';
	import Candado from '$lib/components/iconos/Candado.svelte';
	import Punto from '$lib/components/iconos/Punto.svelte';

	let heading = $state<HTMLElement>();
	$effect(() => { enfocarPrincipal(heading); });

	const catalogo = obtenerCatalogo();

	let bloqueos = $state<Map<string, EstadoEjercicio>>(new Map());
	$effect(() => {
		const sub = liveQuery(() => obtenerEstadosBloqueados()).subscribe({
			next: (lista) => { bloqueos = new Map(lista.map((b) => [b.ejercicio_id, b])); },
			error: () => { anunciarAssertive(mensajePara('ERR-DB-READ')); },
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
		goto(resolve('/biblioteca/[id]', { id: ej.id }));
	}
</script>

<svelte:head><title>Ejercicios</title></svelte:head>
<h1 bind:this={heading} tabindex="-1">Ejercicios</h1>

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
								Nivel {ej.nivel_requerido}{bloqueos.has(ej.id) ? ', bloqueado por dolor' : ''}
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
