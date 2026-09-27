<script lang="ts">
	import { anunciarPolite } from '$lib/a11y/live-region';
	import Boton from './Boton.svelte';
	import { M } from '$lib/mensajes/ui';

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
			? {
					grupo: etiquetaGrupo ?? M.componentes.contadorReps.grupoRepeticiones,
					menos: etiquetaMenos,
					mas: etiquetaMas
				}
			: unidad === 'segundos'
				? {
						grupo: M.componentes.contadorReps.grupoSegundos,
						menos: M.componentes.contadorReps.restarSegundo,
						mas: M.componentes.contadorReps.sumarSegundo
					}
				: unidad === 'porcentaje'
					? {
							grupo: etiquetaGrupo ?? M.componentes.contadorReps.grupoPorcentaje,
							menos: M.componentes.contadorReps.restarCincoPorCiento,
							mas: M.componentes.contadorReps.sumarCincoPorCiento
						}
					: {
							grupo: M.componentes.contadorReps.grupoRepeticiones,
							menos: M.componentes.contadorReps.quitarRepeticion,
							mas: M.componentes.contadorReps.agregarRepeticion
						}
	);

	// Para repeticiones/segundos, el numero crudo. Para porcentaje, "N%".
	const visible = $derived(unidad === 'porcentaje' ? `${valor}%` : `${valor}`);

	// Anuncio: porcentaje -> "N por ciento"; rep/seg -> "N unidad".
	// Sale por la region global; el consumer no deberia duplicarlo.
	function anunciar(): void {
		if (unidad === 'porcentaje') {
			const n = Math.round(Math.min(100, Math.max(0, valor)));
			anunciarPolite(M.componentes.contadorReps.anuncioPorCiento(n));
		} else {
			anunciarPolite(M.componentes.contadorReps.anuncioCantidad(valor, unidad));
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

<!-- Ambos extremos con el mismo Boton secundario en linea: mismo estilo,
     signos grandes y conjunto centrado. En los limites, aria-disabled en
     vez de disabled para que el lector siga encontrando el control. -->
<div class="flex items-center justify-center gap-4" role="group" aria-label={etiquetas.grupo}>
	<Boton
		variante="secundario"
		enLinea
		silencioso
		deshabilitado={valor <= min}
		onclick={() => cambiar(-paso)}
		etiqueta={etiquetas.menos}
	>
		<span class="text-3xl leading-none" aria-hidden="true">−</span>
	</Boton>
	<!-- Sin aria-live aca: el anuncio sale por la region global via anunciarPolite.
	     Ancho minimo por unidad para el peor caso ("100%", "600"): si el ancho
	     siguiera al numero, los botones +/- se moverian al cambiar los digitos. -->
	<span class="text-3xl font-bold tabular-nums font-mono text-text-primary {unidad === 'porcentaje' ? 'min-w-20' : 'min-w-16'} text-center">
		{visible}
	</span>
	<Boton
		variante="secundario"
		enLinea
		silencioso
		deshabilitado={valor >= max}
		onclick={() => cambiar(paso)}
		etiqueta={etiquetas.mas}
	>
		<span class="text-3xl leading-none" aria-hidden="true">+</span>
	</Boton>
</div>