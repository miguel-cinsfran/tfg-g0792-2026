<script lang="ts">
	import Modal from './Modal.svelte';
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

<button id="btn-abrir-condicional" onclick={abrir}>Abrir</button>
{#if abierto}
	<Modal {abierto} {titulo} alCerrar={cerrar} {children} />
{/if}
