<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import {
		sonidosActivados,
		establecerSonidos,
		establecerVolumenEfectos,
		volumenEfectos,
		sonar
	} from '$lib/sonido/reproducir';
	import {
		musicaActivada,
		establecerMusicaActivada,
		establecerVolumenMusica,
		volumenMusica
	} from '$lib/sonido/musica';
	import { volumenAPorcentaje, porcentajeAVolumen } from '$lib/a11y/volumen';
	import { M } from '$lib/mensajes/ui';
	import Cabecera from '$lib/components/Cabecera.svelte';
	import ContadorReps from '$lib/components/ContadorReps.svelte';
	import Interruptor from '$lib/components/Interruptor.svelte';

	let heading = $state<HTMLElement>();

	// Cada entrada a la ruta remonta el componente: el estado se relee
	// del almacen, asi si otra parte del sistema lo cambio, la UI no se
	// desincroniza.
	let sonidos = $state(sonidosActivados());
	let musica = $state(musicaActivada());
	let volumenEfectosPct = $state(volumenAPorcentaje(volumenEfectos()));
	let volumenMusicaPct = $state(volumenAPorcentaje(volumenMusica()));

	$effect(() => {
		enfocarPrincipal(heading);
	});

	function alternarSonidos() {
		sonidos = !sonidos;
		establecerSonidos(sonidos);
		avisar(sonidos ? M.configuracion.audio.estadoEfectos.activado : M.configuracion.audio.estadoEfectos.desactivado, 'exito');
	}

	function alternarMusica() {
		musica = !musica;
		establecerMusicaActivada(musica);
		avisar(musica ? M.configuracion.audio.estadoMusica.activado : M.configuracion.audio.estadoMusica.desactivado, 'exito');
	}

	// Cada toque es la decision final: persiste y emite la muestra en
	// el mismo handler. Para efectos, suena un `tic` corto como muestra
	// audible del nivel (el modulo no lanza si el .mp3 no esta).
	function onCambiarVolumenEfectos() {
		establecerVolumenEfectos(porcentajeAVolumen(volumenEfectosPct));
		sonar('tic');
	}

	function onCambiarVolumenMusica() {
		establecerVolumenMusica(porcentajeAVolumen(volumenMusicaPct));
	}

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.audio.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.audio.titulo}</h1>
</Cabecera>

<section aria-labelledby="sec-audio-efectos" class="mt-4">
	<h2 id="sec-audio-efectos">{M.configuracion.audio.efectos}</h2>
	<div class="flex flex-col gap-4">
		<button
			type="button"
			onclick={alternarSonidos}
			aria-label={sonidos ? M.configuracion.audio.ariaEstadoEfectos.activado : M.configuracion.audio.ariaEstadoEfectos.desactivado}
			class="fila-configuracion"
		>
			<span>{M.configuracion.audio.efectosDeSonido}</span>
			<span class="flex items-center gap-2 min-w-0">
				<span class="text-text-secondary">{sonidos ? M.configuracion.audio.estadoVisibleEfectos.activado : M.configuracion.audio.estadoVisibleEfectos.desactivado}</span>
				<Interruptor activado={sonidos} />
			</span>
		</button>
		<!-- El <input type="range"> es inaccesible con TalkBack en WebView
		     (no anuncia el valor al cambiar, ajusta por porcentaje con
		     las teclas de volumen). Reusamos ContadorReps. Queda operable
		     aun con efectos apagados: el on/off es el interruptor maestro. -->
		<div>
			<ContadorReps
				bind:valor={volumenEfectosPct}
				min={0}
				max={100}
				paso={5}
				unidad="porcentaje"
				etiquetaGrupo={M.configuracion.audio.volumenEfectos.grupo}
				etiquetaMenos={M.configuracion.audio.volumenEfectos.menos}
				etiquetaMas={M.configuracion.audio.volumenEfectos.mas}
				onCambiar={onCambiarVolumenEfectos}
			/>
		</div>
	</div>
</section>

<section aria-labelledby="sec-audio-musica" class="mt-6">
	<h2 id="sec-audio-musica">{M.configuracion.audio.musica}</h2>
	<div class="flex flex-col gap-4">
		<button
			type="button"
			onclick={alternarMusica}
			aria-label={musica ? M.configuracion.audio.ariaEstadoMusica.activado : M.configuracion.audio.ariaEstadoMusica.desactivado}
			class="fila-configuracion"
		>
			<span>{M.configuracion.audio.musicaDeFondo}</span>
			<span class="flex items-center gap-2 min-w-0">
				<span class="text-text-secondary">{musica ? M.configuracion.audio.estadoVisibleMusica.activado : M.configuracion.audio.estadoVisibleMusica.desactivado}</span>
				<Interruptor activado={musica} />
			</span>
		</button>
		<!-- El modulo de musica aplica el volumen al Audio sonando en vivo,
		     asi que el cambio se oye al toque sin muestra extra. -->
		<div>
			<ContadorReps
				bind:valor={volumenMusicaPct}
				min={0}
				max={100}
				paso={5}
				unidad="porcentaje"
				etiquetaGrupo={M.configuracion.audio.volumenMusica.grupo}
				etiquetaMenos={M.configuracion.audio.volumenMusica.menos}
				etiquetaMas={M.configuracion.audio.volumenMusica.mas}
				onCambiar={onCambiarVolumenMusica}
			/>
		</div>
	</div>
</section>
