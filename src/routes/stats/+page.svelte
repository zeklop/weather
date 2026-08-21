<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import { pushClient } from '$lib/pwa/pushManager';

	// Mirrors serverless/src/types.ts StatsSummary — duplicated on purpose so
	// the static frontend does not depend on the worker's source tree.
	interface StatsSummary {
		totalSubscribers: number;
		activeLast7Days: number;
		alertsSentLast7Days: number;
		platforms: { ios: number; android: number; desktop: number };
		topCities: { cityName: string; subscribers: number }[];
		recentAlerts: { alertType: string; cityName: string; recipientsCount: number; timestamp: number }[];
	}

	const settings = getSettingsStore();
	const lang = $derived(settings.language);

	let adminToken = $state('');
	let isUnlocked = $state(false);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let statsData = $state<StatsSummary | null>(null);

	const STORAGE_TOKEN_KEY = 'weather:stats_admin_token';

	onMount(() => {
		if (typeof window === 'undefined') return;
		const saved = sessionStorage.getItem(STORAGE_TOKEN_KEY);
		if (saved) {
			adminToken = saved;
			loadStats(saved);
		}
	});

	async function loadStats(token: string): Promise<void> {
		if (!pushClient.isConfigured) {
			errorMessage = 'PUBLIC_PUSH_WORKER_URL is not configured.';
			return;
		}

		loading = true;
		errorMessage = null;

		try {
			const res = await fetch(`${pushClient.baseUrl}/api/stats/summary`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (res.status === 401) {
				errorMessage = t('stats.unauthorized', lang);
				isUnlocked = false;
				sessionStorage.removeItem(STORAGE_TOKEN_KEY);
			} else if (!res.ok) {
				errorMessage = `Server error (${res.status})`;
			} else {
				statsData = await res.json();
				isUnlocked = true;
				sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function handleUnlock(): void {
		if (!adminToken.trim()) return;
		loadStats(adminToken.trim());
	}

	function handleLock(): void {
		adminToken = '';
		isUnlocked = false;
		statsData = null;
		sessionStorage.removeItem(STORAGE_TOKEN_KEY);
	}

	function formatTimestamp(ts: number): string {
		try {
			return new Date(ts).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return String(ts);
		}
	}

	const platformPercentages = $derived.by(() => {
		if (!statsData || statsData.totalSubscribers === 0) {
			return { ios: 0, android: 0, desktop: 0 };
		}
		const total = statsData.totalSubscribers;
		return {
			ios: Math.round((statsData.platforms.ios / total) * 100),
			android: Math.round((statsData.platforms.android / total) * 100),
			desktop: Math.round((statsData.platforms.desktop / total) * 100)
		};
	});
</script>

<svelte:head>
	<title>{t('stats.title', lang)} — {t('app.title', lang)}</title>
</svelte:head>

<section class="stats-page">
	<div class="stats-header">
		<h1 class="page-title">{t('stats.title', lang)}</h1>
		<p class="page-subtitle">{t('stats.subtitle', lang)}</p>
	</div>

	{#if !isUnlocked}
		<div class="auth-card card">
			<div class="auth-icon-wrap" aria-hidden="true">
				<svg class="auth-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			</div>
			<div class="auth-form">
				<input
					type="password"
					class="token-input"
					placeholder={t('stats.tokenPlaceholder', lang)}
					bind:value={adminToken}
					onkeydown={(e) => e.key === 'Enter' && handleUnlock()}
				/>
				<button class="unlock-btn" type="button" disabled={loading || !adminToken.trim()} onclick={handleUnlock}>
					{loading ? t('stats.loading', lang) : t('stats.unlockBtn', lang)}
				</button>
			</div>
			{#if errorMessage}
				<div class="error-banner">{errorMessage}</div>
			{/if}
		</div>
	{:else}
		<div class="stats-toolbar">
			<button class="tool-btn" type="button" onclick={() => loadStats(adminToken)} disabled={loading}>
				<svg class="tool-icon" class:spinning={loading} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
					<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
					<path d="M21 21v-5h-5" />
				</svg>
				{t('header.refresh', lang)}
			</button>
			<button class="tool-btn secondary" type="button" onclick={handleLock}>
				{t('stats.lock', lang)}
			</button>
		</div>

		{#if statsData}
			<!-- Metric cards -->
			<div class="metrics-grid">
				<div class="metric-card card">
					<div class="metric-label">{t('stats.totalSubscribers', lang)}</div>
					<div class="metric-value">{statsData.totalSubscribers.toLocaleString()}</div>
				</div>
				<div class="metric-card card">
					<div class="metric-label">{t('stats.active7Days', lang)}</div>
					<div class="metric-value">{statsData.activeLast7Days.toLocaleString()}</div>
				</div>
				<div class="metric-card card">
					<div class="metric-label">{t('stats.alertsSent7Days', lang)}</div>
					<div class="metric-value">{statsData.alertsSentLast7Days.toLocaleString()}</div>
				</div>
			</div>

			<!-- Platform breakdown -->
			<div class="section-card card">
				<h2 class="section-title">{t('stats.platforms', lang)}</h2>
				<div class="platform-bar-wrap">
					<div class="platform-bar-track">
						<div class="bar-seg ios" style="width: {platformPercentages.ios}%" title="iOS: {platformPercentages.ios}%"></div>
						<div class="bar-seg android" style="width: {platformPercentages.android}%" title="Android: {platformPercentages.android}%"></div>
						<div class="bar-seg desktop" style="width: {platformPercentages.desktop}%" title="Desktop: {platformPercentages.desktop}%"></div>
					</div>
					<div class="platform-legend">
						<div class="legend-item">
							<span class="legend-dot ios"></span>
							<span class="legend-name">{t('stats.iosStandalone', lang)}</span>
							<span class="legend-val">{statsData.platforms.ios} ({platformPercentages.ios}%)</span>
						</div>
						<div class="legend-item">
							<span class="legend-dot android"></span>
							<span class="legend-name">{t('stats.android', lang)}</span>
							<span class="legend-val">{statsData.platforms.android} ({platformPercentages.android}%)</span>
						</div>
						<div class="legend-item">
							<span class="legend-dot desktop"></span>
							<span class="legend-name">{t('stats.desktop', lang)}</span>
							<span class="legend-val">{statsData.platforms.desktop} ({platformPercentages.desktop}%)</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Top Cities -->
			<div class="section-card card">
				<h2 class="section-title">{t('stats.topCities', lang)}</h2>
				{#if statsData.topCities.length === 0}
					<div class="empty-text">{t('stats.noData', lang)}</div>
				{:else}
					<div class="cities-list">
						{#each statsData.topCities as city, idx}
							<div class="city-item">
								<span class="city-rank">#{idx + 1}</span>
								<span class="city-name">{city.cityName}</span>
								<span class="city-count">{city.subscribers} {t('stats.subscribersCount', lang)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Alerts -->
			<div class="section-card card">
				<h2 class="section-title">{t('stats.recentAlerts', lang)}</h2>
				{#if statsData.recentAlerts.length === 0}
					<div class="empty-text">{t('stats.noAlerts', lang)}</div>
				{:else}
					<div class="alerts-list">
						{#each statsData.recentAlerts as alert}
							<div class="alert-item">
								<div class="alert-meta">
									<span class="alert-type badge">{alert.alertType}</span>
									<span class="alert-time">{formatTimestamp(alert.timestamp)}</span>
								</div>
								<div class="alert-body">
									<span class="alert-city">{alert.cityName}</span>
									<span class="alert-recipients">{alert.recipientsCount} {t('stats.recipients', lang)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</section>

<style>
	.stats-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 800px;
		margin-inline: auto;
	}

	.stats-header {
		margin-bottom: var(--space-2);
	}

	.page-title {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin-bottom: 4px;
	}

	.page-subtitle {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.auth-card {
		padding: var(--space-6) var(--space-4);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
	}

	.auth-icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: rgba(33, 150, 243, 0.12);
		color: var(--accent-strong);
		display: grid;
		place-items: center;
	}

	.auth-icon {
		width: 24px;
		height: 24px;
	}

	.auth-form {
		display: flex;
		gap: var(--space-2);
		width: 100%;
		max-width: 420px;
	}

	.token-input {
		flex: 1;
		height: 40px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-control);
		border: 1px solid var(--divider);
		background: var(--bg-card);
		color: var(--text-primary);
		font-size: 14px;
	}

	.unlock-btn {
		height: 40px;
		padding: 0 var(--space-4);
		border-radius: var(--radius-control);
		background: var(--accent-strong);
		color: #ffffff;
		border: none;
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
	}

	.unlock-btn:disabled {
		opacity: 0.6;
	}

	.error-banner {
		font-size: 13px;
		color: #e53935;
		background: rgba(229, 57, 53, 0.08);
		padding: var(--space-2) var(--space-3);
		border-radius: 8px;
	}

	.stats-toolbar {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 var(--space-3);
		border-radius: 8px;
		background: var(--bg-card);
		color: var(--text-primary);
		border: 1px solid var(--divider);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.tool-btn.secondary {
		color: var(--text-secondary);
	}

	.tool-icon {
		width: 14px;
		height: 14px;
	}

	.tool-icon.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
	}

	@media (max-width: 600px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}

	.metric-card {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.metric-label {
		font-size: 12px;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.metric-value {
		font-size: 26px;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.section-card {
		padding: var(--space-4);
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--space-3);
	}

	.platform-bar-track {
		height: 12px;
		background: var(--divider);
		border-radius: 6px;
		display: flex;
		overflow: hidden;
		margin-bottom: var(--space-3);
	}

	.bar-seg.ios { background: #007aff; }
	.bar-seg.android { background: #34a853; }
	.bar-seg.desktop { background: #fbbc05; }

	.platform-legend {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.legend-dot.ios { background: #007aff; }
	.legend-dot.android { background: #34a853; }
	.legend-dot.desktop { background: #fbbc05; }

	.legend-name {
		flex: 1;
		color: var(--text-secondary);
	}

	.legend-val {
		font-weight: 600;
		color: var(--text-primary);
	}

	.cities-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.city-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: 13px;
		padding-block: 4px;
		border-bottom: 1px solid var(--divider);
	}

	.city-item:last-child {
		border-bottom: none;
	}

	.city-rank {
		font-weight: 700;
		color: var(--text-secondary);
		width: 24px;
	}

	.city-name {
		flex: 1;
		font-weight: 500;
		color: var(--text-primary);
	}

	.city-count {
		font-weight: 600;
		color: var(--accent-strong);
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.alert-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--divider);
	}

	.alert-item:last-child {
		border-bottom: none;
	}

	.alert-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.alert-type.badge {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		background: rgba(33, 150, 243, 0.12);
		color: var(--accent-strong);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.alert-time {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.alert-body {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
	}

	.alert-city {
		font-weight: 600;
		color: var(--text-primary);
	}

	.alert-recipients {
		color: var(--text-secondary);
	}

	.empty-text {
		font-size: 13px;
		color: var(--text-secondary);
		font-style: italic;
	}
</style>
