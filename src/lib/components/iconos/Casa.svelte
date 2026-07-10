<!--
  Icono "house" de Lucide (https://lucide.dev).
  Licencia ISC: Copyright (c) 2022 Lucide Contributors.
  Path copiado inline; sin dependencia npm (la app es offline).
  Source: https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/house.svg
  Verificado en jun 2026.
-->
<script lang="ts">
	let {
		tamano = 24,
		clase = '',
	}: {
		tamano?: number;
		clase?: string;
	} = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={tamano}
	height={tamano}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={clase}
>
	<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
	<path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</svg>
