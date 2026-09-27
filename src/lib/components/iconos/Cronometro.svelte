<!--
  Icono "timer" de Phosphor (https://phosphoricons.com).
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
	<path d="M128,44a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,44Zm0,168a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,212ZM164.49,99.51a12,12,0,0,1,0,17l-28,28a12,12,0,0,1-17-17l28-28A12,12,0,0,1,164.49,99.51ZM92,16A12,12,0,0,1,104,4h48a12,12,0,0,1,0,24H104A12,12,0,0,1,92,16Z"/>
</svg>
