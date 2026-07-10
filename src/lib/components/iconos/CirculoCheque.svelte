<!--
  Icono "circle-check" de Lucide (https://lucide.dev).
  Licencia ISC: Copyright (c) 2022 Lucide Contributors.
  Path copiado inline; sin dependencia npm (la app es offline).
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
	<circle cx="12" cy="12" r="10" />
	<path d="m9 12 2 2 4-4" />
</svg>
