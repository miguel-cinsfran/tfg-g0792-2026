import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		// ADR-0014: generateSW + autoUpdate, manifest manual en
		// static/manifest.json (manifest: false), SW apagado en dev.
		// adapterFallback mete index.html (la entrada SPA) en el precache;
		// sin el, el SW solo cacheaba el bundle y la PWA no abria offline.
		// navigateFallback no se fija: el plugin lo deriva de
		// adapterFallback (el '/' literal del ADR no existe como entrada).
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			manifest: false,
			kit: {
				spa: true,
				adapterFallback: 'index.html'
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff,woff2}'],
				cleanupOutdatedCaches: true
			},
			devOptions: {
				enabled: false
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	// Solo bajo Vitest: resolver la rama cliente de Svelte para poder
	// montar componentes en jsdom (sin esto, mount() resuelve a
	// index-server.js y lanza lifecycle_function_unavailable). No afecta
	// dev ni build, que no definen VITEST.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
