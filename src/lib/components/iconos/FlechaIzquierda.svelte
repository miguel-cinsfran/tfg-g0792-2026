<!--
  Icono "arrow-left" de Phosphor (https://phosphoricons.com).
  Licencia MIT: Copyright (c) 2023 Phosphor Icons.
  Path copiado inline; sin dependencia npm (la app es offline).
-->
<script lang="ts">
	let {
		tamano = '1.5em',
		clase = '',
	}: {
		tamano?: string;
		clase?: string;
	} = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={tamano}
	height={tamano}
	viewBox="0 0 256 256"
	fill="currentColor"
	aria-hidden="true"
	class={clase}
>
	<path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/>
</svg>
