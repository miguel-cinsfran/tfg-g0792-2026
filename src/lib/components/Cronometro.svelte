<script lang="ts">
	import { anunciarPolite } from '$lib/a11y/live-region';
	import { sonar } from '$lib/sonido/reproducir';
	import { M, formatearTiempo } from '$lib/mensajes/ui';
	import Boton from './Boton.svelte';

	function alternarTicTac(n: number): 'tic' | 'tac' {
		return n % 2 === 0 ? 'tic' : 'tac';
	}

	// Segundos para ponerse en posicion antes de que el conteo arranque.
	const CUENTA_ATRAS_SEG = 5;

	let {
		alParar,
		etiquetaEmpezar = M.componentes.cronometro.empezar,
		etiquetaParar = M.componentes.cronometro.detener,
		etiquetaCancelar = M.componentes.cronometro.cancelar,
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
		etiquetaCancelar?: string;
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
	// Cuenta atras previa: el cronometro NO marcha hasta que llega a
	// cero. Cancelarla vuelve al estado inicial sin registrar nada.
	let enCuentaAtras = $state(false);
	let restantesCuenta = $state(0);
	let pulsoCuenta = 0;

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

	// Cuenta atras a 1 Hz, con su propio intervalo: un sonido corto y el
	// numero por la region viva cada segundo. Al llegar a cero suena el
	// inicio, se anuncia "Ya" y RECIEN ahi arranca el conteo.
	$effect(() => {
		if (!enCuentaAtras) return;
		const id = setInterval(() => {
			restantesCuenta--;
			if (restantesCuenta <= 0) {
				enCuentaAtras = false;
				sonar('inicio-serie');
				anunciarPolite(M.componentes.cronometro.ya);
				segundos = 0;
				corriendo = true;
			} else {
				sonar(alternarTicTac(pulsoCuenta));
				pulsoCuenta++;
				anunciarPolite(String(restantesCuenta));
			}
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
			anunciarPolite(M.componentes.cronometro.tiempo(formatearTiempo(segundos)));
			alParar(segundos);
		} else if (enCuentaAtras) {
			enCuentaAtras = false;
			restantesCuenta = 0;
		} else {
			segundos = 0;
			restantesCuenta = CUENTA_ATRAS_SEG;
			pulsoCuenta = 0;
			sonar(alternarTicTac(pulsoCuenta));
			pulsoCuenta++;
			anunciarPolite(String(restantesCuenta));
			enCuentaAtras = true;
		}
	}
</script>

<p class={clases}>{formatearTiempo(segundos)}</p>
{#if enCuentaAtras}
	<p>{M.componentes.cronometro.cuentaAtras(restantesCuenta)}</p>
{/if}
<Boton variante="primario" {tamano} onclick={alternar}>
	{corriendo ? etiquetaParar : enCuentaAtras ? etiquetaCancelar : etiquetaEmpezar}
</Boton>
