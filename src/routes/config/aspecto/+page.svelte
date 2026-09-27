<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enfocarPrincipal } from '$lib/a11y/foco';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import {
		leerAspecto,
		guardarAspecto,
		aplicarPreferenciaAspecto,
		type PreferenciaAspecto
	} from '$lib/aspecto/aspecto';
	import { M } from '$lib/mensajes/ui';
	import GrupoSeleccion from '$lib/components/GrupoSeleccion.svelte';
	import Cabecera from '$lib/components/Cabecera.svelte';

	const OPCIONES: PreferenciaAspecto[] = ['sistema', 'claro', 'oscuro', 'contraste'];

	// Etiquetas y descripciones citadas acá: la guarda de huérfanos exige
	// que cada clave de M aparezca en una pantalla o un componente.
	const ETIQUETAS: Record<PreferenciaAspecto, string> = {
		sistema: M.configuracion.aspecto.sistemaEtiqueta,
		claro: M.configuracion.aspecto.claroEtiqueta,
		oscuro: M.configuracion.aspecto.oscuroEtiqueta,
		contraste: M.configuracion.aspecto.contrasteEtiqueta
	};

	const DESCRIPCIONES: Record<PreferenciaAspecto, string> = {
		sistema: M.configuracion.aspecto.sistemaDescripcion,
		claro: M.configuracion.aspecto.claroDescripcion,
		oscuro: M.configuracion.aspecto.oscuroDescripcion,
		contraste: M.configuracion.aspecto.contrasteDescripcion
	};

	let heading = $state<HTMLElement>();
	let seleccionado = $state<PreferenciaAspecto>(leerAspecto());

	$effect(() => {
		enfocarPrincipal(heading);
	});

	// Como los ajustes de pantalla de Android: elegir una opcion la
	// aplica y la guarda al instante, sin botones de confirmacion.
	$effect(() => {
		const elegido = seleccionado;
		if (elegido === leerAspecto()) return;
		guardarAspecto(elegido);
		void aplicarPreferenciaAspecto();
		avisar(M.configuracion.aspecto.avisoAplicado(ETIQUETAS[elegido]), 'exito');
	});

	function volver() {
		goto(resolve('/config'));
	}
</script>

<svelte:head><title>{M.configuracion.aspecto.titulo}</title></svelte:head>

<Cabecera onclick={volver}>
	<h1 tabindex="-1" bind:this={heading}>{M.configuracion.aspecto.titulo}</h1>
</Cabecera>
<GrupoSeleccion
	leyenda={M.configuracion.aspecto.leyenda}
	nombre="aspecto"
	opciones={OPCIONES.map((opcion) => ({
		valor: opcion,
		etiqueta: ETIQUETAS[opcion],
		descripcion: DESCRIPCIONES[opcion]
	}))}
	bind:valor={seleccionado}
	id="grupo-aspecto-config"
/>
