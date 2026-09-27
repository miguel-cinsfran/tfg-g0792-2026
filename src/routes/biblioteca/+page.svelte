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
	import type { Patron, EstadoEjercicio, Perfil } from '$lib/motor/schema';
	import { obtenerCatalogo } from '$lib/catalogo/estado';
	import { obtenerEstadosBloqueados } from '$lib/db/estado';
	import { obtenerPerfil } from '$lib/db/perfil';
	import { anunciarAssertive } from '$lib/a11y/live-region';
	import { mensajePara, CODIGO_LECTURA_FALLIDA } from '$lib/errores/mensajes';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import {
		registrarOrigenDetalle,
		leerOrigenDetalle,
		limpiarOrigenDetalle,
	} from '$lib/a11y/origen-detalle.svelte';
	import { M } from '$lib/mensajes/ui';
	import { etiquetaPatron, etiquetaZona } from '$lib/catalogo/etiquetas';
	import { capitalizar } from '$lib/ui/texto';
	import type { EjercicioValidado } from '$lib/catalogo/schema';
	import Haltera from '$lib/components/iconos/Haltera.svelte';
	import ChevronDerecha from '$lib/components/iconos/ChevronDerecha.svelte';
	import Candado from '$lib/components/iconos/Candado.svelte';

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

	// null = sin perfil o lectura fallida: sin marcas de fuera del plan.
	let perfil = $state<Perfil | null | undefined>(undefined);
	$effect(() => {
		const sub = liveQuery(() => obtenerPerfil()).subscribe({
			next: (v) => { perfil = v ?? null; },
			error: () => { perfil = null; },
		});
		return () => sub.unsubscribe();
	});

	// Segunda linea de la fila: si el perfil deja el ejercicio fuera se
	// muestra la causa; si no, el nivel como siempre. El bloqueo por
	// dolor de la sesion manda sobre ambas: es temporal y se revisa.
	function segundaLinea(ej: EjercicioValidado, bloqueado: boolean): string {
		// Local para el narrowing: `perfil` es state mutable y TS no lo
		// angosta dentro del callback del filter.
		const p = perfil;
		if (!bloqueado && p !== null && p !== undefined) {
			if (ej.requiere_anclaje && !p.tiene_anclaje) {
				return M.biblioteca.fueraPorAnclaje;
			}
			const zonas = ej.zonas_involucradas.filter((z) =>
				p.zonas_dolor_preexistente.includes(z),
			);
			if (zonas.length > 0) {
				return M.biblioteca.fueraPorDolor(
					zonas.map((z) => etiquetaZona(z).toLowerCase()).join(', '),
				);
			}
		}
		return M.biblioteca.nivelDeEjercicio(ej.nivel_requerido, bloqueado);
	}

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
		<div class="mt-6">
			<h2 id="patron-{grupo.patron}">
				{capitalizar(etiquetaPatron(grupo.patron))}
			</h2>
			{#if grupo.ejercicios.length > 1}
				<p class="m-0 text-sm font-normal text-text-secondary">
					{grupo.ejercicios.length} ejercicios
				</p>
			{/if}
		</div>
		<!-- Un bloque por grupo: las filas se separan con divide, sin fondo
		     ni borde propios. El anillo de foco va hacia adentro para que
		     el recorte de las esquinas no lo oculte. -->
		<ul class="list-none m-0 p-0 mt-2 bg-surface-alt border-2 border-borde-bloque rounded-lg divide-y divide-border overflow-hidden">
			{#each grupo.ejercicios as ej (ej.id)}
				<li>
					<button
						type="button"
						id="ej-{ej.id}"
						class="w-full min-h-12 flex items-center gap-3 text-left px-4 py-3 transition-colors hover:bg-surface-raised active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2 group"
						onclick={() => abrir(ej)}
					>
						{#if bloqueos.has(ej.id)}
							<Candado tamano="1.25em" clase="text-text-secondary shrink-0" />
						{:else}
							<Haltera tamano="1.25em" clase="text-text-secondary shrink-0" />
						{/if}
						<div class="flex-1 min-w-0">
							<span class="block font-semibold text-text-primary">
								{ej.nombre}
							</span>
						<span class="block text-sm text-text-secondary">
							{segundaLinea(ej, bloqueos.has(ej.id))}
						</span>
						</div>
						<ChevronDerecha tamano="1.25em"
							clase="text-text-secondary shrink-0 transition-transform group-hover:translate-x-0.5" />
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/each}
