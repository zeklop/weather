import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Build-time base path contract: '' (root) or '/weather' (GitHub Pages subpath), no trailing slash.
	// loadEnv reads .env / .env.{mode} files AND shell env (prefix '' → any var); shell env wins.
	const kitBase = (loadEnv(mode, process.cwd(), '')['PUBLIC_BASE_PATH'] ?? '') as '' | `/${string}`;

	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				adapter: adapter(),

				// kit.paths.base is expressible directly in the vite plugin options:
				// split_config in @sveltejs/kit/src/core/config routes kit-namespace
				// keys (derived from the kit config schema) into the kit config.
				paths: {
					base: kitBase
				}
			}),

			// Minimal PWA setup — manifest and SW strategies land in T22.
			SvelteKitPWA({
				registerType: 'prompt',
				injectRegister: 'auto'
			})
		]
	};
});
