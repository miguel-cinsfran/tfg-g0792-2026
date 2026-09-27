<!--
  Icono "barbell" de Phosphor (https://phosphoricons.com).
  Licencia MIT: Copyright (c) 2023 Phosphor Icons.
  Path copiado inline; sin dependencia npm (la app es offline).
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
		<path d="M200,64V192a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V136H104v56a16,16,0,0,1-16,16H72a16,16,0,0,1-16-16V64A16,16,0,0,1,72,48H88a16,16,0,0,1,16,16v56h48V64a16,16,0,0,1,16-16h16A16,16,0,0,1,200,64ZM36,72H32A16,16,0,0,0,16,88v32H8.27A8.18,8.18,0,0,0,0,127.47,8,8,0,0,0,8,136h8v32a16,16,0,0,0,16,16h4a4,4,0,0,0,4-4V76A4,4,0,0,0,36,72Zm220,55.47a8.18,8.18,0,0,0-8.25-7.47H240V88a16,16,0,0,0-16-16h-4a4,4,0,0,0-4,4V180a4,4,0,0,0,4,4h4a16,16,0,0,0,16-16V136h8A8,8,0,0,0,256,127.47Z"/>
	{:else}
		<path d="M244,116V88a20,20,0,0,0-20-20H208V64a20,20,0,0,0-20-20H164a20,20,0,0,0-20,20v52H112V64A20,20,0,0,0,92,44H68A20,20,0,0,0,48,64v4H32A20,20,0,0,0,12,88v28a12,12,0,0,0,0,24v28a20,20,0,0,0,20,20H48v4a20,20,0,0,0,20,20H92a20,20,0,0,0,20-20V140h32v52a20,20,0,0,0,20,20h24a20,20,0,0,0,20-20v-4h16a20,20,0,0,0,20-20V140a12,12,0,0,0,0-24ZM36,164V92H48v72Zm52,24H72V68H88Zm96,0H168V68h16Zm36-24H208V92h12Z"/>
	{/if}
</svg>
