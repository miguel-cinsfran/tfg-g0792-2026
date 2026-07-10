<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto, onNavigate } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { Capacitor } from '@capacitor/core';
	import RouteAnnouncer from '$lib/a11y/RouteAnnouncer.svelte';
	import AvisoVisible from '$lib/a11y/AvisoVisible.svelte';
	import { mensajePara } from '$lib/errores/mensajes';
	import { sonar } from '$lib/sonido/reproducir';
	import { reproducirFondo, pausar as pausarMusica, reanudar as reanudarMusica } from '$lib/sonido/musica';
	import { aplicarPreferenciaPantalla } from '$lib/pantalla/despierta';
	import { esRutaConBarraDePestanas } from '$lib/a11y/barra-pestanas';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { decidirAccionAtras, PLAZO_DOBLE_ATRAS_MS } from '$lib/navegacion/atras-telefono';
	import Casa from '$lib/components/iconos/Casa.svelte';
	import Haltera from '$lib/components/iconos/Haltera.svelte';
	import Llama from '$lib/components/iconos/Llama.svelte';
	import CirculoUsuario from '$lib/components/iconos/CirculoUsuario.svelte';
	import type { Component } from 'svelte';

	let { data, children } = $props();

	// @capacitor/app 8 no exporta PluginListenerHandle desde el root.
	let appStateListener: { remove: () => Promise<void> } | null = null;

	let dobleAtrasArmado: 'desarmado' | 'armado' = 'desarmado';
	let timerDobleAtras: ReturnType<typeof setTimeout> | null = null;

	// Traemos a la vista cada focusin porque el WebView no scrollea solo
	// con TalkBack. 'nearest' es idempotente y respeta el scroll-padding
	// de app.css. Sin smooth para no chocar con prefers-reduced-motion.
	function onFocusIn(e: FocusEvent) {
		const target = e.target as HTMLElement | null;
		target?.scrollIntoView?.({ block: 'nearest' });
	}

	onMount(async () => {
		sonar('inicio-app');

		const { registerSW } = await import('virtual:pwa-register');
		registerSW({ immediate: true });

		// Arranca apenas se monta el layout. El modulo maneja el desbloqueo
		// por gesto si el autoplay esta bloqueado.
		reproducirFondo();

		// Si el usuario dejo la pantalla-siempre-encendida activada, se
		// re-aplica en cada arranque (el flag del sistema no persiste).
		void aplicarPreferenciaPantalla();

		// Sin manejador, Capacitor cierra la app con un solo atras (modal
		// abierto incluido). Primero se ofrece a los modales via evento
		// cancelable; si nadie lo consume, la politica depende de la ruta.
		if (Capacitor.isNativePlatform()) {
			const { App } = await import('@capacitor/app');
			void App.addListener('backButton', ({ canGoBack }) => {
				const ev = new CustomEvent('volveratras', { cancelable: true });
				window.dispatchEvent(ev);
				if (ev.defaultPrevented) return;
				const ruta = page.url.pathname;
				const esPestana = esRutaConBarraDePestanas(ruta);
				const esInicio = ruta === '/';
				const accion = decidirAccionAtras(ruta, dobleAtrasArmado, esPestana, esInicio);
				if (accion.tipo === 'ir-a-inicio') {
					void goto(resolve('/'));
					return;
				}
				if (accion.tipo === 'armar-doble-atras') {
					dobleAtrasArmado = 'armado';
					avisar('Toca atrás otra vez para salir');
					if (timerDobleAtras !== null) clearTimeout(timerDobleAtras);
					timerDobleAtras = setTimeout(() => {
						dobleAtrasArmado = 'desarmado';
						timerDobleAtras = null;
					}, PLAZO_DOBLE_ATRAS_MS);
					return;
				}
				if (accion.tipo === 'minimizar') {
					if (timerDobleAtras !== null) {
						clearTimeout(timerDobleAtras);
						timerDobleAtras = null;
					}
					dobleAtrasArmado = 'desarmado';
					void App.minimizeApp();
					return;
				}
				if (canGoBack) history.back();
				else void App.minimizeApp();
			});
			// Pausar/reanudar musica al pasar a background/volver.
			const handle = await App.addListener('appStateChange', ({ isActive }) => {
				if (isActive) reanudarMusica();
				else pausarMusica();
			});
			appStateListener = handle;
		}

		document.addEventListener('focusin', onFocusIn);
	});

	onDestroy(() => {
		document.removeEventListener('focusin', onFocusIn);
		void appStateListener?.remove();
		appStateListener = null;
		// Defensivo ante HMR/tests: no dejar el setTimeout vivo.
		if (timerDobleAtras !== null) {
			clearTimeout(timerDobleAtras);
			timerDobleAtras = null;
		}
	});

	// Fundido breve entre rutas (View Transitions). Solo visual: el foco y
	// los anuncios siguen en manos de RouteAnnouncer/enfocarPrincipal.
	// Se omite si el sistema pide reducir movimiento.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				// Si otra navegacion la supersede (cadena de redirects del
				// bootstrap), complete rechaza: se traga para no ensuciar la
				// consola; la transicion simplemente se corta.
				await navigation.complete.catch(() => {});
			});
		});
	});

	const tabs = [
		{ href: '/', label: 'Inicio', Icono: Casa },
		{ href: '/biblioteca', label: 'Ejercicios', Icono: Haltera },
		{ href: '/progreso', label: 'Racha', Icono: Llama },
		{ href: '/config', label: 'Perfil', Icono: CirculoUsuario }
	] as const satisfies ReadonlyArray<{ href: string; label: string; Icono: Component }>;

	let currentPath = $derived(page.url.pathname);
	// La barra solo se muestra en rutas "normales". Onboarding y sesion
	// son flujos lineales: la accion de avance vive en BarraAccion al pie.
	let mostrarBarraPestanas = $derived(esRutaConBarraDePestanas(currentPath));
	let routed = $state(false);

	$effect(() => {
		if (routed) return;
		if (data?.perfil === undefined) return; // error case
		routed = true;
		if (data.perfil == null) {
			goto(resolve('/onboarding'), { replaceState: true });
		} else if (currentPath !== '/') {
			goto(resolve('/'), { replaceState: true });
		}
	});
</script>

{#if data?.error}
	<!-- Error fatal: no se montan las regiones globales; esta pantalla
	     lleva su propia region assertive inline. -->
	<main class="p-4">
		<h1>Error</h1>
		<div role="alert" aria-live="assertive" class="sr-only">
			{mensajePara(data.error)}
		</div>
		<p>{mensajePara(data.error)}</p>
		<button onclick={() => location.reload()}>Volver a intentar</button>
	</main>
{:else}
	<div id="live-polite" aria-live="polite" aria-atomic="true" class="sr-only"></div>
	<div id="live-assertive" aria-live="assertive" aria-atomic="true" role="alert" class="sr-only"></div>

	<RouteAnnouncer />

	<!-- Espejo visible (no modal) de las regiones aria-live para videntes.
	     El lector sigue siendo anunciado por las regiones sr-only. -->
	<AvisoVisible />

	<div class="mx-auto max-w-lg px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-24">
		{@render children()}
	</div>

	{#if mostrarBarraPestanas}
		<!-- El patron WAI de tabs (role=tablist + aria-selected) no funciona
		     en TalkBack sobre WebView: lee "tab" en ingles y no anuncia el
		     estado. El estado se codifica en el aria-label. La <ul>/<li>
		     nativa da el "N de 4" gratis. aria-roledescription="pestaña"
		     reemplaza la palabra "boton" que TalkBack agrega al <button>;
		     si lo ignora, no es peor que antes. -->
		<nav aria-label="Navegación principal" class="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
			<ul class="flex justify-around list-none m-0 p-0">
				{#each tabs as tab (tab.href)}
					{@const activo = currentPath === tab.href}
					<li class="flex-1">
						<button
							type="button"
							aria-label={activo ? `${tab.label} seleccionada` : tab.label}
							aria-roledescription="pestaña"
							onclick={() => {
								// Re-seleccionar la activa no dispara el sonido de cambio.
								if (activo) return;
								sonar('cambio-pestania');
								void goto(resolve(tab.href));
							}}
							class="flex flex-col items-center justify-center gap-1 w-full px-2 py-2 min-h-12 text-center no-underline border-t-2 -mt-px transition-colors hover:text-acento active:text-acento text-xs {activo ? 'text-acento font-bold border-acento' : 'text-text-secondary border-transparent'}"
						>
							<tab.Icono tamano={24} />
							<span>{tab.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/if}