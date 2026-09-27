<!--
  Icono "chart-bar" de Phosphor (https://phosphoricons.com).
  Licencia MIT: Copyright (c) 2023 Phosphor Icons.
  Paths copiados inline; sin dependencia npm (la app es offline).
-->
<script lang="ts">
	let {
		tamano = '1.5em',
		clase = '',
		relleno = false,
	}: {
		tamano?: string;
		clase?: string;
		relleno?: boolean;
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
	{#if relleno}
		<path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16h8V136a8,8,0,0,1,8-8H72a8,8,0,0,1,8,8v64H96V88a8,8,0,0,1,8-8h32a8,8,0,0,1,8,8V200h16V40a8,8,0,0,1,8-8h40a8,8,0,0,1,8,8V200h8A8,8,0,0,1,232,208Z"/>
	{:else}
		<path d="M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z"/>
	{/if}
</svg>
