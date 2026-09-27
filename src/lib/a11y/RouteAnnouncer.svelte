<script lang="ts">
	import { tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { anunciarPolite } from './live-region';
	import { consumirSupresionAnuncioDeRuta, reaplicarFocoPendiente } from './foco';

	afterNavigate(async (nav) => {
		// Tras el tick la pagina nueva ya aplico su <title>.
		await tick();
		// El anunciador propio de SvelteKit no se apaga por configuracion y
		// duplicaria el anuncio en modo assertive: se lo oculta al lector.
		document.getElementById('svelte-announcer')?.setAttribute('aria-hidden', 'true');
		// En carga en frio SvelteKit resetea el foco despues del $effect de
		// la pagina; aca ya termino, asi que se reaplica el foco al h1.
		const focoQuedo = reaplicarFocoPendiente();
		// Si el foco quedo en el h1, el lector ya leyo el titulo.
		if (consumirSupresionAnuncioDeRuta() && focoQuedo) return;
		const ruta = nav.to?.url.pathname ?? '';
		const titulo = document.title || `Navegado a ${ruta}`;
		anunciarPolite(titulo);
	});
</script>
