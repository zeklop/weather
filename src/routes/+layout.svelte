<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { getFavoritesStore, isUnnamedLocation } from '$lib/stores/favorites.svelte';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { createForecastStore } from '$lib/stores/forecast.svelte';
	import { setForecastStore } from '$lib/stores/context';
	import { t } from '$lib/i18n';
	import SearchSheet, { openSearch } from '$lib/components/SearchSheet.svelte';
	import PwaInstallBanner from '$lib/components/PwaInstallBanner.svelte';
	import PwaInstallModal, { openPwaInstallModal } from '$lib/components/PwaInstallModal.svelte';

	let { children } = $props();

	let mounted = $state(false);
	let updateSWFn = $state<((reloadPage?: boolean) => Promise<void>) | null>(null);
	let showUpdatePrompt = $state(false);

	onMount(async () => {
		mounted = true;
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			updateSWFn = registerSW({
				immediate: true,
				onNeedRefresh() {
					showUpdatePrompt = true;
				}
			});
		}
	});

	const location = getLocationStore();
	const favorites = getFavoritesStore();
	const settings = getSettingsStore();
	const lang = $derived(settings.language);
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

	const navItems = $derived([
		{ href: '/', route: '/', label: t('nav.home', lang), icon: 'home' },
		{ href: '/forecast/', route: '/forecast', label: t('nav.forecast', lang), icon: 'forecast' },
		{ href: '/favorites/', route: '/favorites', label: t('nav.favorites', lang), icon: 'star' },
		{ href: '/settings/', route: '/settings', label: t('nav.settings', lang), icon: 'settings' }
	]);

	function isActive(item: { href: string; route: string; label: string; icon: string }): boolean {
		return routeId === item.route;
	}

	const isFavorite = $derived(favorites.isFavorite(location.current));
	const isUnnamed = $derived(isUnnamedLocation(location.current));
	const isRefreshing = $derived(
		forecastStore.status === 'loading' || forecastStore.refreshing
	);
	const starLabel = $derived(
		isUnnamed
			? t('header.unnamedLocationStar', lang)
			: isFavorite
				? t('header.removeFromFavorites', lang)
				: t('header.addToFavorites', lang)
	);
	const starTitle = $derived(
		isUnnamed ? t('header.unnamedLocationTitle', lang) : undefined
	);
</script>

<svelte:head>
	<title>{t('app.title', lang)} — {mounted ? location.current.name : '...'}</title>
	<meta name="description" content={t('app.description', lang)} />
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="{base}/icons/app/icon-180.png" />
	<link rel="manifest" href="{base}/manifest.webmanifest" />
</svelte:head>

<div class="shell">
	{#if showUpdatePrompt}
		<div class="update-toast" role="status">
			<span class="update-toast-text">{t('pwa.updateAvailable', lang)}</span>
			<button class="update-toast-btn" type="button" onclick={() => updateSWFn?.(true)}>
				{t('pwa.updateBtn', lang)}
			</button>
		</div>
	{/if}

	<header class="app-header">
		<div class="container">
			<div class="header-row">
				<div class="app-title">{mounted ? location.current.name : '…'}</div>
				<div class="header-actions">
					<button
						class="icon-btn"
						type="button"
						aria-label={t('header.refresh', lang)}
						aria-busy={isRefreshing}
						onclick={() => forecastStore.refresh()}
					>
						<svg
							class="icon"
							class:spinning={isRefreshing}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
							<path d="M3 3v5h5" />
							<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
							<path d="M21 21v-5h-5" />
						</svg>
					</button>
					<button class="icon-btn" type="button" aria-label={t('header.search', lang)} onclick={openSearch}>
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
						disabled={isUnnamed}
						aria-disabled={isUnnamed ? 'true' : undefined}
						title={starTitle}
						aria-label={starLabel}
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

	<PwaInstallBanner onopenmodal={openPwaInstallModal} />

	<main class="app-main">
		{@render children()}
	</main>

	<SearchSheet />
	<PwaInstallModal />
</div>

<nav class="bottom-nav" aria-label={t('nav.ariaLabel', lang)}>
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
	{:else if name === 'forecast'}
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
			<path d="M8 2v4" />
			<path d="M16 2v4" />
			<rect width="18" height="18" x="3" y="4" rx="2" />
			<path d="M3 10h18" />
			<path d="M8 14h.01" />
			<path d="M12 14h.01" />
			<path d="M16 14h.01" />
			<path d="M8 18h.01" />
			<path d="M12 18h.01" />
			<path d="M16 18h.01" />
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

	.update-toast {
		position: fixed;
		top: max(env(safe-area-inset-top, 0px), 12px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: calc(100% - 32px);
		max-width: 480px;
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
		background: var(--bg-card);
		border: 1px solid var(--divider);
		border-radius: var(--radius-control);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		backdrop-filter: blur(16px) saturate(1.4);
		font-size: 14px;
		font-weight: 500;
	}

	.update-toast-text {
		flex: 1;
		min-width: 0;
		color: var(--text-primary);
	}

	.update-toast-btn {
		flex-shrink: 0;
		min-height: 36px;
		padding: 0 var(--space-3);
		border: none;
		border-radius: calc(var(--radius-control) - 4px);
		background: var(--accent-strong);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
	}

	.update-toast-btn:active {
		opacity: 0.85;
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

	.icon.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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
