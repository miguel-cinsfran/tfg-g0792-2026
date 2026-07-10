<!--
  Icono "arrow-right" de Lucide (https://lucide.dev).
  Licencia ISC: Copyright (c) 2022 Lucide Contributors.
  Path copiado inline; sin dependencia npm (la app es offline).
  Source: https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/arrow-right.svg
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
	<path d="M5 12h14" />
	<path d="m12 5 7 7-7 7" />
</svg>