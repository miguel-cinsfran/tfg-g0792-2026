<script lang="ts">
	import { anunciarPolite } from '$lib/a11y/live-region';

	let {
		valor = $bindable(0),
		min = 0,
		max = 99,
		paso = 1,
		unidad = 'repeticiones',
		etiquetaGrupo,
		etiquetaMenos,
		etiquetaMas,
		onCambiar
	}: {
		valor?: number;
		min?: number;
		max?: number;
		// Incremento entre toques. Default 1. El stepper de volumen lo usa
		// en 5 para no eternizar el barrido.
		paso?: number;
		// 'porcentaje' es el caso del control de volumen: el anuncio y
		// la unidad visible se formatean distinto.
		unidad?: 'repeticiones' | 'segundos' | 'porcentaje';
		// Si el consumidor necesita que el `role="group"` lleve OTRO
		// nombre accesible (ej. el stepper de volumen), puede
		// sobreescribirlos. Si no, se derivan de la unidad.
		etiquetaGrupo?: string;
		etiquetaMenos?: string;
		etiquetaMas?: string;
		// Llamado SOLO cuando el valor efectivamente cambia (los toques
		// contra los limites no disparan). Util para persistir o sonar.
		onCambiar?: (nuevo: number) => void;
	} = $props();

	const etiquetas = $derived(
		etiquetaMenos !== undefined && etiquetaMas !== undefined
			? { grupo: etiquetaGrupo ?? 'Repeticiones', menos: etiquetaMenos, mas: etiquetaMas }
			: unidad === 'segundos'
				? { grupo: 'Segundos', menos: 'Restar un segundo', mas: 'Sumar un segundo' }
				: unidad === 'porcentaje'
					? { grupo: etiquetaGrupo ?? 'Porcentaje', menos: 'Restar cinco por ciento', mas: 'Sumar cinco por ciento' }
					: { grupo: 'Repeticiones', menos: 'Quitar una repetición', mas: 'Agregar una repetición' }
	);

	// Para repeticiones/segundos, el numero crudo. Para porcentaje, "N%".
	const visible = $derived(unidad === 'porcentaje' ? `${valor}%` : `${valor}`);

	// Anuncio: porcentaje -> "N por ciento"; rep/seg -> "N unidad".
	// Sale por la region global; el consumer no deberia duplicarlo.
	function anunciar(): void {
		if (unidad === 'porcentaje') {
			const n = Math.round(Math.min(100, Math.max(0, valor)));
			anunciarPolite(`${n} por ciento`);
		} else {
			anunciarPolite(`${valor} ${unidad}`);
		}
	}

	function cambiar(delta: number): void {
		const nuevo = Math.min(max, Math.max(min, valor + delta));
		if (nuevo !== valor) {
			valor = nuevo;
			anunciar();
			onCambiar?.(nuevo);
		}
	}
</script>

<div class="flex items-center gap-4" role="group" aria-label={etiquetas.grupo}>
	<button
		onclick={() => cambiar(-paso)}
		disabled={valor <= min}
		aria-label={etiquetas.menos}
		class="min-h-12 min-w-12 rounded-lg transition-colors active:brightness-90 bg-surface-alt border border-border-strong text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface touch-manipulation"
	>
		−
	</button>
	<!-- Sin aria-live aca: el anuncio sale por la region global via anunciarPolite.
	     Ancho minimo por unidad para el peor caso ("100%", "600"): si el ancho
	     siguiera al numero, los botones +/- se moverian al cambiar los digitos. -->
	<span class="text-3xl font-bold tabular-nums font-mono text-text-primary {unidad === 'porcentaje' ? 'min-w-20' : 'min-w-16'} text-center">
		{visible}
	</span>
	<button
		onclick={() => cambiar(paso)}
		disabled={valor >= max}
		aria-label={etiquetas.mas}
		class="min-h-12 min-w-12 rounded-lg transition-colors active:brightness-90 bg-acento hover:bg-acento-hover text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-surface touch-manipulation"
	>
		+
	</button>
</div>