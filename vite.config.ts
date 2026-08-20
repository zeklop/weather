import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Build-time base path contract: '' (root) or '/weather' (GitHub Pages subpath), no trailing slash.
	// loadEnv reads .env / .env.{mode} files AND shell env (prefix '' → any var); shell env wins.
	const kitBase = (loadEnv(mode, process.cwd(), '')['PUBLIC_BASE_PATH'] ?? '') as '' | `/${string}`;
	// Derived pair per design doc: KIT_BASE → kit.paths.base; URL_BASE = KIT_BASE + '/' → all manifest/SW URLs.
	const urlBase = `${kitBase}/`;

	return {
		define: {
			__BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10))
		},
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				adapter: adapter({ fallback: '404.html' }),

				// kit.paths.base is expressible directly in the vite plugin options:
				// split_config in @sveltejs/kit/src/core/config routes kit-namespace
				// keys (derived from the kit config schema) into the kit config.
				paths: {
					base: kitBase
				}
			}),

			// Manifest + service worker, single source (@vite-pwa/sveltekit). SW filename stays sw.js
			// (vite-plugin-pwa default; spec §4.4's service-worker.js is a documented deviation).
			SvelteKitPWA({
				base: urlBase,
				scope: urlBase,
				registerType: 'autoUpdate',
				injectRegister: null,

				// Mirror +layout.ts trailingSlash='always' so prerendered page URLs get a trailing '/'
				// in the precache manifest (offline navigation matches /forecast/ etc.).
				kit: {
					base: urlBase,
					trailingSlash: 'always'
				},

				manifest: {
					name: 'Weather',
					short_name: 'Weather',
					description: 'Weather and forecast up to 10 days',
					lang: 'en',
					display: 'standalone',
					orientation: 'portrait-primary',
					background_color: '#F5F7FA',
					theme_color: '#F5F7FA',
					// Base-safe per design doc: URL_BASE = PUBLIC_BASE_PATH + '/'.
					start_url: urlBase,
					scope: urlBase,
					icons: [
						{ src: `${urlBase}icons/app/icon-192.png`, sizes: '192x192', type: 'image/png' },
						{ src: `${urlBase}icons/app/icon-512.png`, sizes: '512x512', type: 'image/png' },
						{
							src: `${urlBase}icons/app/icon-maskable-512.png`,
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						},
						{ src: `${urlBase}icons/app/icon-180.png`, sizes: '180x180', type: 'image/png' }
					]
				},

				workbox: {
					cleanupOutdatedCaches: true,
					// Exact precached home URL (vite.base is normalized to end with '/', matching the
					// home precache entry); offline navigation to unknown URLs serves the app shell.
					navigateFallback: urlBase,
					runtimeCaching: [
						{
							// Same-origin static assets (precache already covers build assets;
							// this covers the rest — icons, fonts, etc.): cache first, bounded, 30 days.
							urlPattern: ({ url }) =>
								url.origin === self.location.origin &&
								/\.(?:js|css|svg|png|webp|woff2?)$/i.test(url.pathname),
							handler: 'CacheFirst',
							options: {
								cacheName: 'static-assets',
								expiration: {
									maxEntries: 60,
									maxAgeSeconds: 30 * 24 * 60 * 60
								}
							}
						}
					]
				}
			})
		]
	};
});