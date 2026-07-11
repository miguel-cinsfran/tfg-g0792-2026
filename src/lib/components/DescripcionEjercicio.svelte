<!--
  DescripcionEjercicio: presenta una DescripcionPropioceptiva completa.
  Los pasos (posicion inicial, ejecucion) van en lista ordenada; las
   claves sueltas (referencias, errores) en lista con viñetas. Listas
   nativas sin clase: el lector anuncia "lista, N elementos" y app.css
   les devuelve numeros y viñetas. En la evaluacion el usuario necesita
   lo minimo para ejecutar: con plegarClaves las claves finas quedan en
   un desplegable a un toque; el resto de la app las ve todas de una.
 -->
<script lang="ts">
	import type { DescripcionPropioceptiva } from '$lib/motor/schema';

	let {
		descripcion,
		encabezado = 'h3',
		plegarClaves = false
	}: {
		descripcion: DescripcionPropioceptiva;
		/** Nivel de titulo de cada seccion, segun la jerarquia de la pagina. */
		encabezado?: 'h2' | 'h3';
		/** Pliega referencias y errores en un desplegable (evaluacion). */
		plegarClaves?: boolean;
	} = $props();
</script>

<svelte:element this={encabezado}>Posición inicial</svelte:element>
<ol>
	{#each descripcion.posicion_inicial as paso, i (i)}
		<li>{paso}</li>
	{/each}
</ol>

<svelte:element this={encabezado}>Ejecución</svelte:element>
<ol>
	{#each descripcion.ejecucion as paso, i (i)}
		<li>{paso}</li>
	{/each}
</ol>

{#snippet claves()}
	<svelte:element this={encabezado}>Referencias propioceptivas</svelte:element>
	<ul>
		{#each descripcion.referencias_propioceptivas as clave, i (i)}
			<li>{clave}</li>
		{/each}
	</ul>

	<svelte:element this={encabezado}>Errores comunes</svelte:element>
	<ul>
		{#each descripcion.errores_comunes as error, i (i)}
			<li>{error}</li>
		{/each}
	</ul>
{/snippet}

{#if plegarClaves}
	<details class="desplegable">
		<summary>Claves de forma y errores comunes</summary>
		{@render claves()}
	</details>
{:else}
	{@render claves()}
{/if}
