<script lang="ts">
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { sonar } from '$lib/sonido/reproducir';
	import { formatearTiempo } from '$lib/mensajes/ui';
	import Boton from './Boton.svelte';

	function alternarTicTac(n: number): 'tic' | 'tac' {
		return n % 2 === 0 ? 'tic' : 'tac';
	}

	let {
		alParar,
		etiquetaEmpezar = 'Empezar a contar',
		etiquetaParar = 'Parar',
		tamano = 'normal',
		reloj = false,
		// Cadencia del pulso tic/tac. El conteo y los anuncios siguen a
		// 1 Hz; el pulso corre en su PROPIO setInterval. Sostener: 500
		// (2/seg). Default 1000 (1/seg).
		cadenciaRelojMs = 1000,
	}: {
		alParar: (segundos: number) => void;
		etiquetaEmpezar?: string;
		etiquetaParar?: string;
		tamano?: 'normal' | 'grande';
		reloj?: boolean;
		cadenciaRelojMs?: number;
	} = $props();

	const clases = $derived(
		tamano === 'grande'
			? 'text-5xl font-bold tabular-nums font-mono text-text-primary'
			: 'text-2xl font-bold tabular-nums font-mono text-text-primary'
	);

	let corriendo = $state(false);
	let segundos = $state(0);

	// Conteo 1 Hz. Anuncia el tiempo cada 5s con formato humano. Es un
	// cronometro ABIERTO (cuenta hacia arriba, sin tope), asi que no hay
	// "ultimos 5 segundos" como en la cuenta atras del Temporizador.
	$effect(() => {
		if (!corriendo) return;
		const id = setInterval(() => {
			segundos++;
			if (segundos % 5 === 0) anunciarPolite(formatearTiempo(segundos));
		}, 1000);
		return () => clearInterval(id);
	});

	// Pulso del reloj: setInterval propio. Contador y pulso son dos
	// relojes independientes. Al parar, `corriendo` baja y el pulso se
	// silencia. Alterna tic/tac por un contador propio: la paridad de
	// `segundos` no refleja la del pulso cuando difieren las cadencias.
	$effect(() => {
		if (!reloj) return;
		let pulso = 0;
		const id = setInterval(() => {
			if (corriendo) sonar(alternarTicTac(pulso));
			pulso++;
		}, cadenciaRelojMs);
		return () => clearInterval(id);
	});

	function alternar() {
		if (corriendo) {
			corriendo = false;
			anunciarPolite(`Listo: ${formatearTiempo(segundos)}`);
			alParar(segundos);
		} else {
			segundos = 0;
			corriendo = true;
			anunciarPolite('Contando');
		}
	}
</script>

<p class={clases}>{formatearTiempo(segundos)}</p>
<Boton variante="primario" {tamano} onclick={alternar}>
	{corriendo ? etiquetaParar : etiquetaEmpezar}
</Boton>
