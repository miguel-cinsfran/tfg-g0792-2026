<!--
  GrupoSeleccion: fieldset de opciones mutuamente excluyentes como
  tarjetas tactiles. El input radio real se mantiene focuseable y
  operable (sr-only) para que el lector siga anunciando "boton de
  opcion, N de M" con su estado.
-->
<script lang="ts" generics="V extends string">
	import CirculoCheque from '$lib/components/iconos/CirculoCheque.svelte';
	import { sonar } from '$lib/sonido/reproducir';

	type Opcion = { valor: V; etiqueta: string; descripcion?: string };

	let {
		leyenda,
		nombre,
		opciones,
		valor = $bindable<V | null>(null),
		error = null,
		id
	}: {
		leyenda: string;
		nombre: string;
		opciones: Opcion[];
		valor: V | null;
		error?: string | null;
		id?: string;
	} = $props();

	// El fieldsetId se usa para mover el foco desde la pagina cuando
	// la validacion falla.
	const fieldsetId = $derived(id ?? `grupo-${nombre}`);
	const errorId = $derived(`${fieldsetId}-error`);
	const tieneError = $derived(error !== null && error !== undefined);
</script>

<fieldset
	id={fieldsetId}
	aria-describedby={tieneError ? errorId : undefined}
	class="m-0 border-0 p-0"
>
	<legend class="text-text-primary font-semibold mb-2">{leyenda}</legend>
	<div class="flex flex-col gap-2">
		{#each opciones as opcion (opcion.valor)}
			{@const elegida = valor === opcion.valor}
			<label
				class="group flex items-start gap-3 rounded-lg border bg-surface-alt p-3 min-h-12 cursor-pointer select-none touch-manipulation transition-colors focus-within:ring-2 focus-within:ring-acento focus-within:ring-offset-2 focus-within:ring-offset-surface {elegida
					? 'border-l-2 border-l-acento border-y border-r border-border-strong text-acento'
					: 'border border-border-strong text-text-primary'}"
			>
				<input
					type="radio"
					class="sr-only"
					name={nombre}
					value={opcion.valor}
					checked={elegida}
					onchange={() => {
						valor = opcion.valor;
						// El onchange nativo solo dispara por interaccion;
						// los cambios programaticos no llaman a onchange.
						sonar('seleccion');
					}}
				/>
				<div class="flex-1 min-w-0">
					<div class="font-bold {elegida ? 'text-acento' : 'text-text-primary'}">
						{opcion.etiqueta}
					</div>
					{#if opcion.descripcion}
						<div class="text-sm {elegida ? 'text-acento/80' : 'text-text-secondary'}">
							{opcion.descripcion}
						</div>
					{/if}
				</div>
				{#if elegida}
					<CirculoCheque tamano={20} clase="shrink-0 text-acento" />
				{/if}
			</label>
		{/each}
	</div>
	{#if tieneError}
		<p id={errorId} class="mt-2 text-sm text-error" role="alert">
			{error}
		</p>
	{/if}
</fieldset>
