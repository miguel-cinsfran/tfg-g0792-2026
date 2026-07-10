<script lang="ts">
	import { tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { anunciarPolite } from './live-region';
	import { consumirSupresionAnuncioDeRuta } from './foco';

	// afterNavigate + tick: el anuncio sale despues de que la pagina nueva
	// monto y aplico su <svelte:head><title>. Con $effect sobre pathname
	// (version anterior) el efecto corria antes del titulo nuevo.
	// El fallback con la ruta cubre paginas sin titulo.
	// Si enfocarPrincipal ya movio el foco al h1, TalkBack leyo el titulo:
	// suprimir el anuncio duplicado.
	afterNavigate(async (nav) => {
		await tick();
		if (consumirSupresionAnuncioDeRuta()) return;
		const ruta = nav.to?.url.pathname ?? '';
		const titulo = document.title || `Navegado a ${ruta}`;
		anunciarPolite(titulo);
	});
</script>
