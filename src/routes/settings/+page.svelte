<script lang="ts">
	import { onMount } from 'svelte';
	import { openSearch } from '$lib/components/SearchSheet.svelte';
	import { getAlertsStoreContext, getForecastStore } from '$lib/stores/context';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';

	const INSTALL_HINT_KEY = 'weather:installHintSeen';

	const forecast = getForecastStore();
	const alertsStore = getAlertsStoreContext();
	const location = getLocationStore();
	const settings = getSettingsStore();
	const lang = $derived(settings.language);

	const refreshing = $derived(forecast.refreshing);

	async function toggleAlerts(): Promise<void> {
		if (!settings.alertsEnabled) {
			const res = await alertsStore.requestPermission();
			if (res === 'granted') {
				settings.setAlertsEnabled(true);
			} else {
				settings.setAlertsEnabled(false);
			}
		} else {
			settings.setAlertsEnabled(false);
		}
	}

	// Hydration gate: city and lastUpdated come from localStorage, so the
	// server render shows neutral placeholders until the client mounts
	// (same pattern as the favorites route).
	let mounted = $state(false);

	// §35: PWA install hint — Safari iOS, not standalone, once, plain card.
	let showInstallHint = $state(false);

	function isSafariIos(): boolean {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent;
		if (!/Safari/.test(ua) || /CriOS|FxiOS/.test(ua)) return false;
		// iPhone/iPad/iPod, plus iPadOS 13+ which reports a Macintosh desktop UA.
		return /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 0 && /Macintosh/.test(ua));
	}

	function isStandalone(): boolean {
		if (typeof window === 'undefined') return false;
		if (window.matchMedia('(display-mode: standalone)').matches) return true;
		return (navigator as Navigator & { standalone?: boolean }).standalone === true;
	}

	onMount(() => {
		mounted = true;
		void location.syncPermission();
		// The hint only ever renders inside Settings, so «unless opened from
		// Settings» is satisfied by construction; the persisted flag enforces
		// «no more than once».
		if (!isSafariIos() || isStandalone()) return;
		let seen = false;
		try {
			seen = localStorage.getItem(INSTALL_HINT_KEY) === '1';
			if (!seen) localStorage.setItem(INSTALL_HINT_KEY, '1');
		} catch {
			/* storage unavailable — show anyway, retry next visit */
		}
		showInstallHint = !seen;
	});

	function refresh(): void {
		forecast.refresh();
	}

	// Device-event timestamp (epoch ms), not an Open-Meteo wall-time string:
	// `new Date()` is correct here; the format.ts helpers are for wall-time only.
	const lastUpdatedFormat = $derived(
		new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	const lastUpdatedText = $derived(
		mounted && settings.lastUpdated !== null
			? lastUpdatedFormat.format(new Date(settings.lastUpdated))
			: '—'
	);

	const cityName = $derived(mounted ? location.current.name : '…');

	const geoNote = $derived(
		mounted
			? location.geoState === 'denied'
				? t('settings.geoDenied', lang)
				: location.geoState === 'unavailable'
					? t('settings.geoUnavailable', lang)
					: location.geoState === 'error'
						? t('settings.geoTimeout', lang)
						: null
			: null
	);
</script>

<svelte:head>
	<title>{t('settings.title', lang)} | {t('app.title', lang)}</title>
	<meta name="description" content={t('settings.description', lang)} />
</svelte:head>

<h1 class="sr-only">{t('settings.title', lang)}</h1>

<div class="settings">
	{#if showInstallHint}
		<div class="card hint">
			<div class="hint-title">{t('settings.installApp', lang)}</div>
			<div class="hint-text">{t('settings.installAppHint', lang)}</div>
		</div>
	{/if}

	<div class="card group">
		<div class="row">
			<span class="row-label">{t('settings.language', lang)}</span>
			<div class="lang-selector" role="group" aria-label={t('settings.languageSelectAria', lang)}>
				<button
					class="lang-btn"
					class:active={mounted && settings.language === 'en'}
					type="button"
					onclick={() => settings.setLanguage('en')}
				>
					English
				</button>
				<button
					class="lang-btn"
					class:active={mounted && settings.language === 'ru'}
					type="button"
					onclick={() => settings.setLanguage('ru')}
				>
					Русский
				</button>
			</div>
		</div>
		<button
			class="row row-btn"
			type="button"
			onclick={openSearch}
			aria-label={t('settings.changeCityAria', lang, { city: cityName })}
		>
			<span class="row-label">{t('settings.city', lang)}</span>
			<span class="row-value row-value-action">
				{cityName}
				<svg
					class="chevron"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			</span>
		</button>
		<div class="row geo-row">
			<div class="geo-line">
				<span class="row-label">{t('settings.geolocation', lang)}</span>
				<button
					class="geo-btn"
					type="button"
					disabled={location.geoPending || location.geoState === 'unavailable'}
					aria-busy={location.geoPending}
					onclick={() => location.requestGeolocation()}
				>
					{#if location.geoPending}
						<span class="spinner geo-spinner" aria-hidden="true"></span>
						<span>{t('settings.geoLocating', lang)}</span>
					{:else if location.geoState === 'error' || location.geoState === 'denied'}
						{t('settings.geoRetry', lang)}
					{:else}
						{t('settings.geoAuto', lang)}
					{/if}
				</button>
			</div>
			{#if geoNote}
				<div class="row-note" role="status">
					<span>{geoNote}</span>
					{#if location.geoState === 'denied' || location.geoState === 'error'}
						<button
							class="retry-btn"
							type="button"
							disabled={location.geoPending}
							onclick={() => location.requestGeolocation()}
						>
							{t('home.retry', lang)}
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="card group">
		<div class="group-header">
			<span class="group-title">{t('settings.alertsSection', lang)}</span>
		</div>
		<div class="row">
			<span class="row-label">{t('settings.alertsEnabled', lang)}</span>
			<button
				class="toggle-switch"
				class:active={mounted && settings.alertsEnabled}
				type="button"
				role="switch"
				aria-checked={mounted && settings.alertsEnabled}
				aria-label={t('settings.alertsEnabled', lang)}
				onclick={toggleAlerts}
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>

		{#if mounted && settings.alertsEnabled}
			<div class="row">
				<span class="row-label">{t('settings.precipitationAlerts', lang)}</span>
				<button
					class="toggle-switch"
					class:active={settings.precipitationAlerts}
					type="button"
					role="switch"
					aria-checked={settings.precipitationAlerts}
					aria-label={t('settings.precipitationAlerts', lang)}
					onclick={() => settings.setPrecipitationAlerts(!settings.precipitationAlerts)}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="row">
				<span class="row-label">{t('settings.severeAlerts', lang)}</span>
				<button
					class="toggle-switch"
					class:active={settings.severeAlerts}
					type="button"
					role="switch"
					aria-checked={settings.severeAlerts}
					aria-label={t('settings.severeAlerts', lang)}
					onclick={() => settings.setSevereAlerts(!settings.severeAlerts)}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="row">
				<span class="row-label">{t('settings.freezeAlerts', lang)}</span>
				<button
					class="toggle-switch"
					class:active={settings.freezeAlerts}
					type="button"
					role="switch"
					aria-checked={settings.freezeAlerts}
					aria-label={t('settings.freezeAlerts', lang)}
					onclick={() => settings.setFreezeAlerts(!settings.freezeAlerts)}
				>
					<span class="toggle-thumb"></span>
				</button>
			</div>
			<div class="row quiet-hours-row">
				<div class="quiet-hours-line">
					<div class="label-with-desc">
						<span class="row-label">{t('settings.quietHours', lang)}</span>
						<span class="row-desc">{t('settings.quietHoursDesc', lang)}</span>
					</div>
					<button
						class="toggle-switch"
						class:active={settings.quietHoursEnabled}
						type="button"
						role="switch"
						aria-checked={settings.quietHoursEnabled}
						aria-label={t('settings.quietHours', lang)}
						onclick={() => settings.setQuietHoursEnabled(!settings.quietHoursEnabled)}
					>
						<span class="toggle-thumb"></span>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="card group">
		<div class="row">
			<span class="row-label">{t('settings.lastUpdated', lang)}</span>
			{#if mounted && settings.lastUpdated !== null}
				<time class="row-value" datetime={new Date(settings.lastUpdated).toISOString()}>
					{lastUpdatedText}
				</time>
			{:else}
				<span class="row-value">—</span>
			{/if}
		</div>
		<div class="row">
			<button
				class="refresh-btn"
				type="button"
				disabled={refreshing}
				aria-busy={refreshing}
				onclick={refresh}
			>
				{#if refreshing}
					<span class="spinner" aria-hidden="true"></span>
				{/if}
				{refreshing ? t('settings.updating', lang) : t('settings.update', lang)}
			</button>
		</div>
	</div>

	<div class="card group">
		<div class="row">
			<span class="row-label">{t('settings.dataSource', lang)}</span>
			<a class="row-link" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
				Open-Meteo
			</a>
		</div>
		<div class="row">
			<span class="row-label">{t('settings.weatherIcons', lang)}</span>
			<a
				class="row-link"
				href="https://github.com/basmilius/meteocons"
				target="_blank"
				rel="noopener noreferrer"
			>
				Meteocons
			</a>
		</div>
		<div class="row">
			<span class="row-label">{t('settings.version', lang)}</span>
			<span class="row-value">v{__BUILD_DATE__}</span>
		</div>
	</div>

	<footer class="settings-footer">
		<p class="footer-author">
			{#if lang === 'ru'}
				Автор: <a class="footer-link" href="https://github.com/zeklop" target="_blank" rel="noopener noreferrer">Zeklop</a>
			{:else}
				Created by <a class="footer-link" href="https://github.com/zeklop" target="_blank" rel="noopener noreferrer">Zeklop</a>
			{/if}
		</p>
		<p class="footer-version">v{__BUILD_DATE__}</p>
	</footer>
</div>

<style>
	.settings {
		display: grid;
		gap: var(--space-4);
		max-width: 100%;
		min-width: 0;
	}

	.group {
		padding: var(--space-2) var(--space-4);
		max-width: 100%;
		min-width: 0;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		border-bottom: 1px solid var(--divider);
		min-width: 0;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-label {
		font-size: 15px;
	}

	.row-value {
		font-size: 15px;
		color: var(--text-secondary);
		text-align: right;
	}

	.row-btn {
		width: 100%;
		border: none;
		border-bottom: 1px solid var(--divider);
		background: none;
		padding: 0;
		color: inherit;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		border-radius: 0;
	}

	.row-btn:active {
		background: var(--divider);
	}

	.row-value-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}

	/* ---------- language selector ---------- */
	.lang-selector {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: var(--bg-page-top);
		padding: 2px;
		border-radius: var(--radius-control);
		border: 1px solid var(--divider);
	}

	.lang-btn {
		min-height: 32px;
		padding: 0 var(--space-3);
		border: none;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.lang-btn.active {
		background: var(--accent);
		color: #fff;
		font-weight: 600;
	}

	.chevron {
		width: 16px;
		height: 16px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	/* ---------- geolocation row ---------- */
	.geo-row {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
	}

	.geo-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		min-width: 0;
	}

	.geo-btn {
		min-height: 44px;
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: none;
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.geo-btn:active {
		background: var(--divider);
	}

	.geo-btn:disabled {
		color: var(--text-secondary);
		opacity: 0.6;
		cursor: not-allowed;
	}

	.geo-spinner {
		border-color: rgba(0, 122, 255, 0.25);
		border-top-color: var(--accent-strong);
	}

	.row-note {
		font-size: 13px;
		color: var(--text-secondary);
		padding-bottom: var(--space-2);
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.retry-btn {
		display: inline-block;
		margin-left: var(--space-1);
		padding: 2px var(--space-2);
		border: 1px solid var(--accent);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--accent-strong);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.retry-btn:active {
		background: var(--divider);
	}

	.retry-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ---------- refresh ---------- */
	.refresh-btn {
		width: 100%;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
	}

	.refresh-btn:active {
		opacity: 0.85;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ---------- about links ---------- */
	.row-link {
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}

	/* ---------- install hint ---------- */
	.hint {
		padding: var(--space-4);
		background: #eff6ff;
		border-color: #bfdbfe;
	}

	.hint-title {
		font-size: 15px;
		font-weight: 600;
	}

	.hint-text {
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	/* ---------- group header & toggles ---------- */
	.group-header {
		padding: var(--space-2) 0 var(--space-1);
		border-bottom: 1px solid var(--divider);
	}

	.group-title {
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.toggle-switch {
		width: 48px;
		height: 28px;
		border-radius: 14px;
		background: var(--divider);
		border: none;
		padding: 2px;
		cursor: pointer;
		position: relative;
		display: inline-flex;
		align-items: center;
		transition: background-color 0.2s ease;
		flex-shrink: 0;
	}

	.toggle-switch.active {
		background: var(--accent);
	}

	.toggle-thumb {
		width: 24px;
		height: 24px;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transform: translateX(0);
		transition: transform 0.2s ease;
		display: block;
	}

	.toggle-switch.active .toggle-thumb {
		transform: translateX(20px);
	}

	.quiet-hours-row {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding: var(--space-2) 0;
	}

	.quiet-hours-line {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		min-width: 0;
	}

	.label-with-desc {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.row-desc {
		font-size: 12px;
		color: var(--text-secondary);
	}

	/* ---------- settings footer ---------- */
	.settings-footer {
		text-align: center;
		padding: var(--space-4) var(--space-2) var(--space-6);
		font-size: 13px;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.footer-author {
		margin: 0;
	}

	.footer-link {
		color: var(--accent-strong);
		font-weight: 500;
		text-decoration: none;
	}

	.footer-link:hover {
		text-decoration: underline;
	}

	.footer-version {
		margin: 0;
		font-size: 12px;
		opacity: 0.8;
	}
</style>
