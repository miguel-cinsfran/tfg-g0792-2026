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
	import { M } from '$lib/mensajes/ui';
	import { sonar } from '$lib/sonido/reproducir';
	import { reproducirFondo, pausar as pausarMusica, reanudar as reanudarMusica } from '$lib/sonido/musica';
	import { aplicarAlEntrarSesion, aplicarAlSalirSesion, transicionSesion } from '$lib/pantalla/despierta';
	import { aplicarPreferenciaAspecto, iniciarEscuchaSistema } from '$lib/aspecto/aspecto';
	import { esRutaConBarraDePestanas } from '$lib/a11y/barra-pestanas';
	import { avisar } from '$lib/a11y/avisar.svelte';
	import { decidirAccionAtras, PLAZO_DOBLE_ATRAS_MS } from '$lib/navegacion/atras-telefono';
	import { obtenerVolver } from '$lib/navegacion/atras-pantalla';
	import { decidirTransicion, consumirMarcaVolver } from '$lib/navegacion/transicion';
	import Casa from '$lib/components/iconos/Casa.svelte';
	import Haltera from '$lib/components/iconos/Haltera.svelte';
	import GraficoBarras from '$lib/components/iconos/GraficoBarras.svelte';
	import CirculoUsuario from '$lib/components/iconos/CirculoUsuario.svelte';
	import type { Component } from 'svelte';

	let { data, children } = $props();

	// @capacitor/app 8 no exporta PluginListenerHandle desde el root.
	let appStateListener: { remove: () => Promise<void> } | null = null;

	let dobleAtrasArmado: 'desarmado' | 'armado' = 'desarmado';
	let timerDobleAtras: ReturnType<typeof setTimeout> | null = null;
	let detenerEscuchaAspecto: (() => void) | null = null;

	// Traemos a la vista cada focusin porque el WebView no scrollea solo
	// con TalkBack. 'nearest' es idempotente y respeta el scroll-padding
	// de app.css. Sin smooth para no chocar con prefers-reduced-motion.
	function onFocusIn(e: FocusEvent) {
		const target = e.target as HTMLElement | null;
		target?.scrollIntoView?.({ block: 'nearest' });
	}

	onMount(async () => {
		sonar('inicio-app');

		// Dentro del APK los archivos ya estan en el telefono: el SW no
		// aporta nada y al actualizar sirve la copia vieja hasta
		// activarse. En nativo no se registra y se limpia lo que haya
		// quedado de versiones anteriores.
		if (Capacitor.isNativePlatform()) {
			const contenedor = navigator as Navigator & { serviceWorker?: ServiceWorkerContainer };
			if (contenedor.serviceWorker !== undefined) {
				const registros = await contenedor.serviceWorker.getRegistrations();
				for (const registro of registros) await registro.unregister();
			}
			const almacen = (globalThis as { caches?: CacheStorage }).caches;
			if (almacen !== undefined) {
				const claves = await almacen.keys();
				for (const clave of claves) await almacen.delete(clave);
			}
		} else {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		// Arranca apenas se monta el layout. El modulo maneja el desbloqueo
		// por gesto si el autoplay esta bloqueado.
		reproducirFondo();

		// El tema sigue la preferencia guardada y tiñe la barra de estado
		// nativa con su color; mientras sea "sistema" se re-aplica al
		// cambiar el ajuste del telefono.
		void aplicarPreferenciaAspecto();
		detenerEscuchaAspecto = iniciarEscuchaSistema();

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
				// Solo las rutas sin pestanas miran el registro: con barra
				// el telefono siempre va a Inicio o minimiza.
				const volver = esPestana ? null : obtenerVolver();
				const accion = decidirAccionAtras(ruta, dobleAtrasArmado, esPestana, esInicio, volver !== null);
				if (accion.tipo === 'volver-pantalla') {
					volver?.();
					return;
				}
				if (accion.tipo === 'ir-a-inicio') {
					void goto(resolve('/'));
					return;
				}
				if (accion.tipo === 'armar-doble-atras') {
					dobleAtrasArmado = 'armado';
					avisar(M.navegacion.avisoSalir);
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
		detenerEscuchaAspecto?.();
		detenerEscuchaAspecto = null;
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
	// Entre pestanas el cambio es directo; volver desliza al reves (el
	// sentido viaja en <html> y las reglas CSS lo leen). Se omite si el
	// sistema pide reducir movimiento.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const sentido = decidirTransicion(
			navigation.from?.url.pathname ?? null,
			navigation.to?.url.pathname ?? null,
			navigation.type,
			consumirMarcaVolver(),
		);
		if (sentido === 'ninguna') return;
		document.documentElement.dataset.sentidoTransicion = sentido;
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

	// Los cuatro iconos de pestañas aceptan `relleno`: la activa se
	// dibuja maciza para distinguirse por la forma, no solo por color.
	type IconoPestana = Component<{ tamano?: string; clase?: string; relleno?: boolean }>;

	const tabs = [
		{ href: '/', label: M.navegacion.inicio, Icono: Casa },
		{ href: '/biblioteca', label: M.navegacion.ejercicios, Icono: Haltera },
		{ href: '/progreso', label: M.navegacion.progreso, Icono: GraficoBarras },
		{ href: '/perfil', label: M.navegacion.perfil, Icono: CirculoUsuario }
	] as const satisfies ReadonlyArray<{ href: string; label: string; Icono: IconoPestana }>;

	let currentPath = $derived(page.url.pathname);
	// La pantalla encendida actúa solo en /sesion: al entrar se pide
	// keepAwake si la preferencia sigue activada, al salir se libera.
	let rutaAnterior: string | null = null;
	$effect(() => {
		const actual = currentPath;
		const transicion = transicionSesion(rutaAnterior, actual);
		rutaAnterior = actual;
		if (transicion === 'entrar') void aplicarAlEntrarSesion();
		else if (transicion === 'salir') void aplicarAlSalirSesion();
	});	// La barra solo se muestra en rutas "normales". Onboarding y sesion
	// son flujos lineales: la accion de avance vive en BarraAccion al pie.
	let mostrarBarraPestanas = $derived(esRutaConBarraDePestanas(currentPath));
	let routed = $state(false);

	// Altura real de la barra de pestañas, medida en vivo: con la letra
	// del sistema agrandada el pb-24 fijo no alcanzaba y el final del
	// contenido quedaba tapado. Mismo patron que BarraAccion.
	let altoBarra = $state(0);
	let rellenoInferior = $derived(
		mostrarBarraPestanas && altoBarra > 0 ? `calc(${altoBarra}px + 1.5rem)` : '6rem',
	);

	// El control enfocado por el lector tampoco debe quedar tapado: el
	// scroll-padding de html usa ese mismo espacio (6rem si no hay barra).
	// La altura cruda tambien se publica: el aviso visible flota por
	// encima de la barra que haya.
	$effect(() => {
		if (mostrarBarraPestanas && altoBarra > 0) {
			document.documentElement.style.setProperty('--espacio-barra-pestanas', `calc(${altoBarra}px + 1.5rem)`);
			document.documentElement.style.setProperty('--alto-barra-pestanas', `${altoBarra}px`);
		} else {
			document.documentElement.style.removeProperty('--espacio-barra-pestanas');
			document.documentElement.style.removeProperty('--alto-barra-pestanas');
		}
	});

	$effect(() => {
		if (routed) return;
		if (data?.perfil === undefined) return; // error case
		routed = true;
		// Sin perfil la app arranca por el onboarding; con perfil, la URL
		// actual se conserva: los deep links llegan a su ruta.
		if (data.perfil == null) {
			goto(resolve('/onboarding'), { replaceState: true });
		} else if (page.url.pathname.startsWith('/onboarding')) {
			// Con perfil no queda alta que terminar: entrar a un paso del
			// onboarding reabreria la bienvenida; se vuelve al inicio.
			goto(resolve('/'), { replaceState: true });
		}
	});
</script>

{#if data?.error}
	<!-- Error fatal: no se montan las regiones globales; esta pantalla
	     lleva su propia region assertive inline. -->
	<main class="p-4">
		<h1>{M.navegacion.tituloError}</h1>
		<div role="alert" aria-live="assertive" class="sr-only">
			{mensajePara(data.error)}
		</div>
		<p>{mensajePara(data.error)}</p>
		<button onclick={() => location.reload()}>{M.navegacion.botonReintentar}</button>
	</main>
{:else}
	<div id="live-polite" aria-live="polite" aria-atomic="true" class="sr-only"></div>
	<div id="live-assertive" aria-live="assertive" aria-atomic="true" role="alert" class="sr-only"></div>

	<RouteAnnouncer />

	<!-- Espejo visible (no modal) de las regiones aria-live para videntes.
	     El lector sigue siendo anunciado por las regiones sr-only. -->
	<AvisoVisible />

	<!-- Franja opaca sobre la zona de la barra de estado: con la ventana
	     bajo la barra (SDK 36) el contenido scrolleado pasaba por detrás.
	     Nombre propio de transicion: no viaja con la pagina. -->
	<div aria-hidden="true" style="view-transition-name: franja-arriba" class="fixed top-0 left-0 right-0 z-10 bg-surface h-[env(safe-area-inset-top)]"></div>

	<main class="mx-auto max-w-lg px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]" style:padding-bottom={rellenoInferior}>
		{@render children()}
	</main>

	{#if !mostrarBarraPestanas}
		<!-- Gemela de la franja superior para la barra de gestos. Nombre
		     propio de transicion: no viaja con la pagina. -->
		<div aria-hidden="true" style="view-transition-name: franja-abajo" class="fixed bottom-0 left-0 right-0 z-10 bg-surface h-[env(safe-area-inset-bottom)]"></div>
	{/if}

	{#if mostrarBarraPestanas}
		<!-- El patron WAI de tabs (role=tablist + aria-selected) no funciona
		     en TalkBack sobre WebView: lee "tab" en ingles y no anuncia el
		     estado. El estado se codifica en el aria-label. La <ul>/<li>
		     nativa da el "N de 4" gratis. aria-roledescription="pestaña"
		     reemplaza la palabra "boton" que TalkBack agrega al <button>;
		     si lo ignora, no es peor que antes. -->
		<nav aria-label={M.navegacion.navegacionPrincipal} bind:clientHeight={altoBarra} style="view-transition-name: barra-pestanas" class="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
			<ul class="flex justify-around list-none m-0 p-0">
				{#each tabs as tab (tab.href)}
					{@const activo = currentPath === tab.href || (tab.href !== '/' && currentPath.startsWith(`${tab.href}/`))}
					<li class="flex-1 min-w-0">
						<button
							type="button"
							aria-label={activo ? `${tab.label}${M.navegacion.seleccionada}` : tab.label}
							aria-roledescription={M.navegacion.pestania}
							onclick={() => {
								// Solo la ruta exacta no navega: desde una
								// subruta, tocar la pestaña vuelve a la lista.
								if (currentPath === tab.href) return;
								sonar('cambio-pestania');
								void goto(resolve(tab.href));
							}}
							class="flex flex-col items-center justify-center gap-1 w-full px-2 py-2 min-h-12 text-center no-underline border-t-4 transition-colors hover:text-acento active:text-acento text-xs {activo ? 'text-acento font-bold border-acento' : 'text-text-secondary border-transparent'}"
						>
							<tab.Icono tamano="2em" relleno={activo} />
							<!-- El nombre accesible completo va en aria-label del boton;
							     esta etiqueta puede recortarse con el texto agrandado sin
							     que el lector pierda la palabra entera. -->
							<span class="block max-w-full truncate">{tab.label}</span>
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
{/if}