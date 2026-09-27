<!--
  Icono "caret-right" de Phosphor (https://phosphoricons.com).
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
	<path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"/>
</svg>
