<!--
  Dibujo de interruptor para las filas conmutables: pista y círculo,
  con el color de acción cuando está activado. Es solo visual
  (aria-hidden): la semántica la da el botón que lo contiene, con el
  estado en su nombre accesible, que es lo que TalkBack anuncia.
-->
<script lang="ts">
	let { activado }: { activado: boolean } = $props();
</script>

<span
	aria-hidden="true"
	class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors {activado
		? 'bg-accion border-accion-borde'
		: 'bg-surface-alt border-border-strong'}"
>
	<span
		class="inline-block h-5 w-5 rounded-full transition-all {activado
			? 'translate-x-6 bg-sobre-accion'
			: 'translate-x-1 bg-text-secondary'}"
	></span>
</span>
