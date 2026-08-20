<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { getFavoritesStore } from '$lib/stores/favorites.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { createForecastStore } from '$lib/stores/forecast.svelte';
	import { setForecastStore } from '$lib/stores/context';
	import SearchSheet, { openSearch } from '$lib/components/SearchSheet.svelte';

	let { children } = $props();

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true
			});
		}
	});

	const location = getLocationStore();
	const favorites = getFavoritesStore();
	const forecastStore = createForecastStore({ locationStore: location });
	setForecastStore(forecastStore);

	$effect(() => {
		forecastStore.load(location.current);
	});

	$effect(() => {
		function onVisibilityChange(): void {
			if (document.visibilityState === 'visible') {
				forecastStore.load(location.current);
			}
		}
		function onPageshow(): void {
			forecastStore.load(location.current);
		}
		function onOnline(): void {
			forecastStore.load(location.current);
		}

		document.addEventListener('visibilitychange', onVisibilityChange);
		window.addEventListener('pageshow', onPageshow);
		window.addEventListener('online', onOnline);

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			window.removeEventListener('pageshow', onPageshow);
			window.removeEventListener('online', onOnline);
			forecastStore.destroy();
		};
	});

	const routeId = $derived(page.route.id);

	const navItems = [
		{ href: '/', route: '/', label: 'Главная', icon: 'home' },
		{ href: '/map/', route: '/map', label: 'Карта', icon: 'map' },
		{ href: '/favorites/', route: '/favorites', label: 'Избранное', icon: 'star' },
		{ href: '/settings/', route: '/settings', label: 'Настройки', icon: 'settings' }
	];

	function isActive(item: (typeof navItems)[number]): boolean {
		return routeId === item.route;
	}

	const isFavorite = $derived(favorites.isFavorite(location.current));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="{base}/icons/app/icon-180.png" />
	<link rel="manifest" href="{base}/manifest.webmanifest" />
</svelte:head>

<div class="shell">
	<header class="app-header">
		<div class="container">
			<div class="header-row">
				<div class="app-title">{location.current.name}</div>
				<div class="header-actions">
					<button class="icon-btn" type="button" aria-label="Найти город" onclick={openSearch}>
						<svg
							class="icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
						</svg>
					</button>
					<button
						class="icon-btn"
						class:favorited={isFavorite}
						type="button"
						aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
						aria-pressed={isFavorite}
						onclick={() => favorites.toggleFavorite(location.current)}
					>
						<svg
							class="icon"
							viewBox="0 0 24 24"
							fill={isFavorite ? 'currentColor' : 'none'}
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path
								d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<SearchSheet />
</div>

<nav class="bottom-nav" aria-label="Основная навигация">
	<div class="container nav-inner">
		{#each navItems as item}
			<a
				class="nav-item"
				class:active={isActive(item)}
				aria-current={isActive(item) ? 'page' : undefined}
				href={base + item.href}
			>
				{@render navIcon(item.icon)}
				<span class="nav-label">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

{#snippet navIcon(name: string)}
	{#if name === 'home'}
		<svg
			class="nav-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
			<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
		</svg>
	{:else if name === 'map'}
		<svg
			class="nav-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
			/>
			<path d="M15 5.764v15" />
			<path d="M9 3.236v15" />
		</svg>
	{:else if name === 'star'}
		<svg
			class="nav-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
			/>
		</svg>
	{:else}
		<svg
			class="nav-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
			/>
			<circle cx="12" cy="12" r="3" />
		</svg>
	{/if}
{/snippet}

<style>
	.shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		max-width: 100%;
		min-width: 0;
	}

	.container {
		width: 100%;
		max-width: 860px;
		margin-inline: auto;
		padding-inline: var(--space-4);
		min-width: 0;
	}

	.app-header {
		position: sticky;
		top: 0;
		z-index: 20;
		padding-top: env(safe-area-inset-top);
		background: var(--bg-card);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		backdrop-filter: blur(16px) saturate(1.4);
		border-bottom: 1px solid var(--divider);
		max-width: 100%;
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		min-height: 48px;
		min-width: 0;
	}

	.app-title {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	:global(:root) {
		--nav-height: 58px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		flex-shrink: 0;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: none;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--text-secondary);
	}

	.icon-btn:disabled {
		opacity: 0.5;
	}

	.icon-btn:active {
		background: var(--divider);
	}

	.icon-btn.favorited {
		color: var(--accent-strong);
	}

	.icon {
		width: 22px;
		height: 22px;
	}

	.app-main {
		flex: 1;
		width: 100%;
		max-width: 860px;
		margin-inline: auto;
		padding: var(--space-3) var(--space-4) calc(var(--nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 24px);
		min-width: 0;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--bg-card);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		backdrop-filter: blur(16px) saturate(1.4);
		border-top: 1px solid var(--divider);
		max-width: 100%;
	}

	.nav-inner {
		display: flex;
		height: var(--nav-height);
		min-width: 0;
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 44px;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 11px;
		line-height: 1.2;
		min-width: 0;
	}

	.nav-item.active {
		color: var(--accent-strong);
		font-weight: 600;
	}

	.nav-icon {
		width: 24px;
		height: 24px;
	}
</style>
