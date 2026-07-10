<script lang="ts">
	import ModalDolor from './ModalDolor.svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		titulo = 'Confirmar',
	}: {
		children: Snippet;
		titulo?: string;
	} = $props();

	let abierto = $state(false);
	function abrir() {
		abierto = true;
	}
	function cerrar() {
		abierto = false;
	}
</script>

<button id="btn-abrir-externo" onclick={abrir}>Abrir</button>
<ModalDolor {abierto} {titulo} alCerrar={cerrar} {children} />