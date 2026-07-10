<script lang="ts">
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { sonar } from '$lib/sonido/reproducir';
	import { formatearTiempo } from '$lib/mensajes/ui';
	import { SvelteSet } from 'svelte/reactivity';

	function alternarTicTac(n: number): 'tic' | 'tac' {
		return n % 2 === 0 ? 'tic' : 'tac';
	}

	let {
		segundos,
		alTerminar,
		etiqueta = 'Descanso',
		alAviso,
		aviso_segundos = 3,
		reloj = true,
		// Cadencia del pulso tic/tac. El conteo y los anuncios siguen a 1 Hz.
		cadenciaRelojMs = 1000,
	}: {
		segundos: number;
		alTerminar?: () => void;
		etiqueta?: string;
		alAviso?: () => void;
		aviso_segundos?: number;
		reloj?: boolean;
		cadenciaRelojMs?: number;
	} = $props();

	// `segundos` se captura al montar: cada descanso nace con su duracion
	// y un cambio del padre NO resetea la cuenta. Para reiniciar se
	// remonta el componente (p.ej. con {#key} en el consumidor).
	// svelte-ignore state_referenced_locally
	let restantes = $state(segundos);
	let avisoDisparado = $state(false);
	// Conteo y pulso son dos setInterval independientes. Comparten este
	// flag para que el pulso se silencie en cuanto el conteo llega a 0
	// (sin race conditions). Doble seguro: el pulso consulta corriendo
	// y restantes en cada tick.
	let corriendo = $state(true);

	// Hitos de voz: multiplos de 30 descendentes si > 60s, 10 siempre
	// como ultimo hito. En los ultimos 5 seg se anuncia de a uno
	// (5, 4, 3, 2, 1). El hito de 10 NO entra en ese rango.
	let hitosPendientes = new SvelteSet<number>();
	$effect(() => {
		const hitos = new SvelteSet<number>();
		if (segundos > 60) {
			for (let h = Math.floor(segundos / 30) * 30; h >= 30; h -= 30) {
				if (h < segundos && h > 0) hitos.add(h);
			}
		}
		if (segundos > 10) hitos.add(10);
		for (let n = 5; n >= 1; n--) {
			if (n < segundos && n > 0) hitos.add(n);
		}
		hitosPendientes = hitos;
	});

	// Conteo: 1 Hz, independiente del pulso. Asi el conteo visible y los
	// anuncios siguen siendo por segundo aunque el reloj pulse al doble.
	$effect(() => {
		const id = setInterval(() => {
			restantes--;
			if (restantes === aviso_segundos && !avisoDisparado) {
				avisoDisparado = true;
				alAviso?.();
			}
			if (hitosPendientes.has(restantes) && restantes > 0) {
				hitosPendientes.delete(restantes);
				anunciarPolite(`Quedan ${formatearTiempo(restantes)}`);
			}
			if (restantes <= 0) {
				clearInterval(id);
				corriendo = false;
				alTerminar?.();
			}
		}, 1000);
		return () => clearInterval(id);
	});

	// Pulso del reloj: setInterval propio. Alterna tic/tac por un
	// contador propio, no por restantes (que cambia a otro ritmo).
	$effect(() => {
		if (!reloj) return;
		let pulso = 0;
		const id = setInterval(() => {
			if (corriendo && restantes > 0) sonar(alternarTicTac(pulso));
			pulso++;
		}, cadenciaRelojMs);
		return () => clearInterval(id);
	});
</script>

<p class="text-2xl font-bold tabular-nums font-mono text-text-primary">
	{etiqueta}: {restantes} segundos
</p>
