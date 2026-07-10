<!--
  Icono "triangle-alert" de Lucide (https://lucide.dev).
  Licencia ISC: Copyright (c) 2022 Lucide Contributors.
  Path copiado inline; sin dependencia npm (la app es offline).
  Source: https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/triangle-alert.svg
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
	<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
	<path d="M12 9v4" />
	<path d="M12 17h.01" />
</svg>
